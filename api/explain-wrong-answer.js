import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger, withTimeout, retry, validateExplanation } from './lib/forge-integrity.js';
import { requireAuth } from './lib/auth.js';

const log = createLogger('explain-wrong-answer');

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
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    log.error('JSON parse error', { originalText: text.slice(0, 300) });
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
  log.info('Calling Gemini for wrong answer explanation');

  const result = await withTimeout(
    retry(() => model.generateContent(prompt), { maxRetries: 3, baseDelay: 1000, logger: log }),
    15000
  );
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
  validateExplanation(parsed);

  return parsed;
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, selectedAnswer, preferredLanguage } = req.body;

    if (!question || !selectedAnswer) {
      return res.status(400).json({ error: 'Missing required fields: question, selectedAnswer' });
    }

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const lang = preferredLanguage || "en";
    const prompt = `IMPORTANT: Respond ONLY in the user's preferred language: "${lang}". Never translate from English afterwards.
Return JSON only: {"explanation":"brief explanation of why the selected answer is wrong and why the correct answer is right"}
Selected answer: ${selectedAnswer}
Question:
${JSON.stringify(question)}`;

    const result = await callGeminiWithValidation(prompt);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to generate explanation', error);
    return res.status(500).json({ error: 'Failed to generate explanation. Please try again.' });
  }
});
