import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger, withTimeout, retry, validateForgeStructure } from './lib/forge-integrity.js';
import { requireAuth } from './lib/auth.js';

const log = createLogger('generate-forge-structure');

let genAI;
let model;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  if (!geminiApiKey) {
    log.warn('GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
  }
} catch (initError) {
  log.error('Module initialization error', initError);
}

function isConfigured() {
  return !!model;
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
    retry(() => model.generateContent(prompt), { logger: log }),
    45000
  );
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
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
                    "type": "string",
                    "question": "string",
                    "options": ["string"],
                    "correctAnswer": "string",
                    "explanation": "string"
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

EXERCISE REQUIREMENTS:
- Generate 3-5 exercises per lesson
- Mix different interaction types appropriate for the subject
- Each exercise must have a clear question
- Multiple choice: provide 4 options
- Include explanation for correct answer
- Make exercises challenging but fair

CURRICULUM QUALITY:
- Group concepts logically (follow real curriculum structure)
- Avoid duplicates and overlapping lessons
- Use clear, student-friendly names
- If the material mentions GCSE, JEE, AP, or other exams, structure accordingly
- Ensure progressive difficulty within units

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
