import { GoogleGenAI } from '@google/genai';
import { createLogger, withTimeout, retry, validateLearningContent } from './_lib/forge-integrity.js';
import { requireAuth } from './_lib/auth.js';

const log = createLogger('generate-learning-content');

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
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function callGeminiWithValidation(prompt) {
  log.info('Calling Gemini for learning content generation');

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
  validateLearningContent(parsed);

  log.info('Learning content validated successfully', {
    subjectCount: parsed.subjects.length,
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
    const prompt = `You are a premium educational AI tutor. Analyze the user's study notes and transform them into a highly interactive, structured learning curriculum.

IMPORTANT: Generate all content ONLY in the user's preferred language: "${lang}". All titles, descriptions, summaries, explanations, examples, questions, options, correct answers, and explanations must be in this language. Maintain educational terminology appropriate for that language. Never translate from English afterwards.

Return strict JSON only with this exact shape:
{
  "subjects": [
    {
      "title": "string",
      "description": "string",
      "units": [
        {
          "title": "string",
          "summary": "string",
          "lessons": [
            {
              "title": "string",
              "summary": "string",
              "explanation": "Detailed explanation of the concept",
              "examples": ["Example 1", "Example 2"],
              "difficulty": "easy|medium|hard",
              "questions": [
                {
                  "type": "multipleChoice|fillBlank|matchPairs|ordering|trueFalse|shortAnswer",
                  "question": "2-4 sentence scenario/context + question – NOT single-line recall",
                  "content": "Additional background/context that supports reasoning (case study, data, scenario)",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "pairs": [{"left":{"id":"l1","text":"..."},"right":{"id":"r1","text":"..."}}],
                  "items": [{"id":"item1","text":"step"}],
                  "correctAnswer": "exact answer or 'l1-r1,l2-r2' for matchPairs or 'id1,id2' for ordering",
                  "explanation": "2-3 sentences: why correct, why distractors wrong, conceptual link"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

SCHEMA FOR INTERACTIVE TYPES (STRICT):
- matchPairs: MUST use "pairs": [{"left":{"id":"l1","text":"..."},"right":{"id":"r1","text":"..."}}] 3-5 pairs, NOT "options".
- ordering: MUST use "items": [{"id":"item1","text":"..."}] 4-6 items.

REQUIREMENTS:
1. Hierarchy: Subject -> Unit -> Lesson.
2. Every Lesson MUST contain:
   - explanation: A deep dive into the concept.
   - examples: At least 2 concrete examples.
   - difficulty: One of 'easy', 'medium', 'hard' – default medium/hard, require connecting ideas.
   - questions: 3-5 exercises per lesson, 2-4 sentence stems with context, mix types.
3. Exercise Types Support – all must be RICH:
   - multipleChoice: 4 plausible options requiring reasoning.
   - fillBlank: contextual sentence.
   - matchPairs: 3-5 left/right pairs (term↔description) using "pairs" schema.
   - ordering: 4-6 steps using "items" schema.
   - trueFalse: scenario-based statement.
   - shortAnswer: reasoning question.
4. Content: Grounded strictly in the notes AND strictly within detected curriculum (CBSE/NCERT/GCSE/JEE/AP etc.) – extra context only to deepen understanding of syllabus, NOT expand beyond it.
5. Explanations: 2-3 sentences why correct and why distractors fail, rewarding understanding.
6. Difficulty: Slightly more challenging – connect 2-3 ideas, cause-effect, compare/justify, best explanation, data interpretation.

NOTES:
${sourceText}`;

    const result = await callGeminiWithValidation(prompt);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to generate learning content', error);
    return res.status(500).json({
      error: 'Failed to generate learning content. Gemini could not create a valid curriculum. Please try again with clearer notes.',
    });
  }
});
