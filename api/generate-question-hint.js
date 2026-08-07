import { GoogleGenAI } from '@google/genai';
import { createLogger, withTimeout, retry, validateHint } from './lib/forge-integrity.js';
import { requireAuth } from './lib/auth.js';

const log = createLogger('generate-question-hint');

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
  log.info('Calling Gemini for hint generation');

  const result = await withTimeout(
    retry(() => googleAI.models.generateContent({ model: geminiModel, contents: prompt }), { logger: log }),
    15000
  );
  const text = result.text;

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
  validateHint(parsed);

  return parsed;
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, preferredLanguage } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Missing required field: question' });
    }

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const lang = preferredLanguage || "en";
    const prompt = `IMPORTANT: Respond ONLY in the user's preferred language: "${lang}". Never translate from English afterwards.
Return JSON only: {"hint":"one short hint that helps without revealing the answer"}
Question:
${JSON.stringify(question)}`;

    const result = await callGeminiWithValidation(prompt);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to generate hint', error);
    return res.status(500).json({ error: 'Failed to generate hint. Please try again.' });
  }
});
