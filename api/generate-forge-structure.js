import { GoogleGenAI } from '@google/genai';
import { createLogger, withTimeout, retry, validateForgeStructure } from './_lib/forge-integrity.js';
import { requireAuth } from './_lib/auth.js';

const log = createLogger('generate-forge-structure');

let googleAI;
let geminiModel;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  geminiModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  if (!geminiApiKey) {
    log.warn('GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    googleAI = new GoogleGenAI({ apiKey: geminiApiKey });
  }
} catch (initError) {
  log.error('Module initialization error', initError);
}

function isConfigured() {
  return !!googleAI;
}

function parseGeminiJson(text) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    log.error('JSON parse error', { originalText: text.slice(0, 500) });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw e;
      }
    }
    throw e;
  }
}

async function callGeminiWithValidation(prompt) {
  log.info('Calling Gemini for forge structure generation');

  const result = await withTimeout(
    retry(() => googleAI.models.generateContent({ model: geminiModel, contents: prompt }), { logger: log }),
    45000
  );
  const text = result.text;

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
  // Temporary logs: AI response + parsed exercise JSON
  log.info('AI response raw length', { length: text.length, preview: text.slice(0,1200) });
  const sampleExercise = parsed?.subject?.units?.[0]?.subUnits?.[0]?.lessons?.[0]?.exercises?.[0];
  log.info('Parsed exercise JSON sample', { sampleExercise, exerciseTypes: (parsed?.subject?.units||[]).flatMap(u=>(u.subUnits||[]).flatMap(su=>(su.lessons||[]).flatMap(l=>(l.exercises||[]).map(e=>e.type)))) });
  validateForgeStructure(parsed);

  log.info('Forge structure validated successfully', {
    subject: parsed.subject.title,
    unitCount: parsed.subject.units.length,
  });

  return parsed;
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sourceText, preferredLanguage } = req.body;

    if (!sourceText) {
      return res.status(400).json({ error: 'Missing required field: sourceText' });
    }

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const lang = preferredLanguage || "en";
    const prompt = `You are an expert curriculum designer. Analyze the study material and create a structured learning path.

IMPORTANT: Generate all content ONLY in the user's preferred language: "${lang}". All titles, descriptions, summaries, concepts, exercises, questions, options, correct answers, and explanations must be in this language. Maintain educational terminology appropriate for that language. Never translate from English afterwards.

First, detect the subject (e.g., Biology, Physics, Chemistry, Mathematics, History, Geography, Computer Science, Business, Languages, etc.).

Then create a curriculum-quality hierarchy following this exact JSON structure:
{
  "subject": {
    "title": "string",
    "description": "string",
    "detectedSubject": "string",
    "units": [
      {
        "id": "string",
        "title": "string",
        "summary": "string",
        "order": number,
        "subUnits": [
          {
            "id": "string",
            "title": "string",
            "summary": "string",
            "order": number,
            "lessons": [
              {
                "id": "string",
                "title": "string",
                "summary": "string",
                "concept": "string",
                "durationMinutes": number,
                "xpReward": number,
                "order": number,
                "interactionTypes": ["string"],
                "exercises": [
                  {
                    "type": "multipleChoice|fillBlank|matchPairs|arrangeOrder|trueFalse|shortAnswer",
                    "question": "2-4 sentence stem with context/scenario – NOT a one-line fact recall. Include relevant background before asking.",
                    "options": ["For multipleChoice: 4 plausibly close options requiring reasoning, NOT keyword matching. For other types: omit or leave []"],
                    "pairs": [{"left":{"id":"l1","text":"term"},"right":{"id":"r1","text":"definition"}}],
                    "items": [{"id":"item1","text":"step to order"}],
                    "correctAnswer": "For multipleChoice/fillBlank/trueFalse/shortAnswer: exact answer. For matchPairs: 'l1-r1,l2-r2,...'. For arrangeOrder: 'id1,id2,id3'",
                    "explanation": "2-3 sentences: why correct, why others wrong, conceptual link. Must reward understanding.",
                    "variants": [{"question":"alternative phrasing 1","options":[],"correctAnswer":"...","explanation":"..."}, {"question":"alternative phrasing 2","options":[],"correctAnswer":"...","explanation":"..."}]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
SCHEMA FOR INTERACTIVE TYPES (STRICT):
- matchPairs: MUST use "pairs": [{"left":{"id":"l1","text":"..."},"right":{"id":"r1","text":"..."}}] with 3-5 pairs. Do NOT use "options" for matching. "question" = instruction stem (2-3 sentences).
- arrangeOrder: MUST use "items": [{"id":"item1","text":"..."}] with 4-6 items. "correctAnswer" = comma-separated ids in correct order.
- multipleChoice/fillBlank/trueFalse/shortAnswer: use "options"/"correctAnswer"/"explanation" as above.

CRITICAL HIERARCHY REQUIREMENTS:
- Generate 6-15 units (not 2-3)
- Each unit must have 3-8 sub-units (not 2-3)
- Each sub-unit must have 3-10 lessons (not 2-3)
- This creates a deep, comprehensive curriculum

LESSON REQUIREMENTS:
- Each lesson must teach ONE tiny concept (2-5 minutes)
- Duration should be 2-5 minutes per lesson
- XP reward: 10-25 XP per lesson based on complexity
- Concept field: the single specific concept being taught
- Examples of good lesson concepts: "What is a Cell?", "Cell Membrane", "Nucleus", "Mitochondria" (NOT "Everything about Cells")

INTERACTION TYPES (choose based on subject):
For Languages: "multipleChoice", "wordBank", "typeAnswer", "fillBlank", "sentenceOrder", "matchVocabulary"
For Biology: "multipleChoice", "labelDiagram", "identifyStructure", "sequenceProcess", "explainFunction", "imageIdentification"
For Chemistry: "multipleChoice", "balanceEquation", "predictProduct", "molecularStructure", "fillCompound", "periodicTable"
For Physics: "multipleChoice", "numericalAnswer", "formulaSelection", "unitConversion", "graphInterpretation", "scenarioReasoning"
For Mathematics: "multipleChoice", "numericalAnswer", "multiStepWorking", "equationSolving", "patternRecognition", "errorFinding"
For History: "multipleChoice", "timelineOrder", "sourceAnalysis", "causeEffect", "matchEvents", "chronologicalSequence"
For Geography: "multipleChoice", "mapInteraction", "imageRecognition", "climateMatch", "caseStudy", "diagramInterpretation"
For Computer Science: "multipleChoice", "codeCompletion", "debugCode", "predictOutput", "arrangeAlgorithm", "buildSnippet"
For Business/Economics: "multipleChoice", "caseStudy", "decisionMaking", "dataInterpretation", "graphAnalysis", "realWorldScenario"

EXERCISE REQUIREMENTS (HIGH QUALITY – REASONING OVER MEMORIZATION):
- Generate 3-5 exercises per lesson, mix types. For matchPairs lessons, at least one matching exercise.
- EVERY question MUST be 2-4 sentences: start with relevant background/context/scenario/data/case-study, then ask. Single-line recall like "What is X?" is FORBIDDEN – instead frame as cause-effect, compare/justify, best explanation, data interpretation, or realistic scenario that requires connecting ideas.
- Examples of desired stems: "A farmer notices ... Given the definition of resource management, which pairing best explains why...?", "Study this climate data for CBSE Class 10 Geography... Which cause-effect chain correctly links...?", "A small business case: ... Which decision follows from...?"
- DIFFICULTY: Slightly more challenging by default – must require linking 2-3 concepts, not isolated fact. Distractors should be plausible and require reasoning to eliminate.
- For EVERY exercise include rich "explanation": 2-3 sentences why correct is correct and why others fail, reinforcing intuition.
- VARIANTS (ANTI-MEMORIZATION): For each exercise, also generate "variants": 2-4 alternative phrasings of the SAME learning objective with same correct concept but different wording/context/numbers. Example: variants:[{question:"...", options:[...], correctAnswer:"...", explanation:"..."}, ...]. Store all variants in "variants" array. Correct mappings must stay consistent across variants.
- Curriculum constraint STRICT: stay within the curriculum detected from SOURCE (e.g., if CBSE/NCERT/JEE/GCSE/AP/IGCSE/board indicated, do NOT introduce extra-curricular topics). Extra context is only allowed if it directly supports understanding of the syllabus (e.g., real-world analogy for a prescribed concept). Think: deepen intuition, not expand syllabus.

CURRICULUM QUALITY:
- Group concepts logically (follow real curriculum structure)
- Avoid duplicates and overlapping lessons
- Use clear, student-friendly names
- Detect curriculum from source (CBSE, NCERT, JEE, GCSE, AP, etc.) and STAY WITHIN IT – extra info only to build intuition for prescribed topics
- Ensure progressive difficulty within units – later lessons within a unit should connect to earlier lessons

STUDY MATERIAL:
${sourceText}`;

    const result = await callGeminiWithValidation(prompt);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to generate forge structure', error);
    return res.status(500).json({
      error: 'Failed to generate structure from study material. Gemini could not create a valid curriculum. Please try again with clearer notes.',
    });
  }
});
