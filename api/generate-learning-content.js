import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger, withTimeout, retry, validateLearningContent } from './lib/forge-integrity.js';
import { requireAuth } from './lib/auth.js';

const log = createLogger('generate-learning-content');

let genAI;
let model;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
    const { sourceText } = req.body;

    if (!sourceText) {
      return res.status(400).json({ error: 'Missing required field: sourceText' });
    }

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const prompt = `You are a premium educational AI tutor. Analyze the user's study notes and transform them into a highly interactive, structured learning curriculum.

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
                  "question": "The question text",
                  "content": "Additional content or context if needed",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": "The correct answer",
                  "explanation": "Why this answer is correct"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

REQUIREMENTS:
1. Hierarchy: Subject -> Unit -> Lesson.
2. Every Lesson MUST contain:
   - explanation: A deep dive into the concept.
   - examples: At least 2 concrete examples.
   - difficulty: One of 'easy', 'medium', 'hard'.
   - questions: 3-5 exercises per lesson.
3. Exercise Types Support:
   - multipleChoice: 4 options.
   - fillBlank: A sentence with a blank.
   - matchPairs: Pairs of related items.
   - ordering: A sequence of steps.
   - trueFalse: A statement to verify.
   - shortAnswer: A question requiring a brief response.
4. Content: Grounded strictly in the notes.
5. Explanations: Provide detailed explanations for every exercise.

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
