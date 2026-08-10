import { GoogleGenAI } from '@google/genai';
import { createLogger, withTimeout, retry, validateForgeAssistantReply } from './_lib/forge-integrity.js';
import { requireAuth } from './_lib/auth.js';

const log = createLogger('ask-forge-assistant');

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
  } catch {
    log.error('JSON parse error', { originalText: text.slice(0, 300) });
    const cleaned = text.replace(/```json\s*|```/gi, '').trim();
    return { reply: cleaned };
  }
}

async function callGeminiWithValidation(prompt) {
  log.info('Calling Gemini for forge assistant');

  const result = await withTimeout(
    retry(() => googleAI.models.generateContent({ model: geminiModel, contents: prompt }), { logger: log }),
    30000
  );
  const text = result.text;

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
  validateForgeAssistantReply(parsed);

  return parsed;
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, subjects, preferredLanguage } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required field: messages' });
    }

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const structureSummary = subjects && subjects.length
      ? subjects
          .map((subject) => {
            const units = (subject.units || []).map((unit) => `Unit: ${unit.title}`).join('\n');
            return `Subject: ${subject.title}\n${units}`;
          })
          .join('\n\n')
      : 'No Forge subjects have been generated yet.';

    const conversation = messages
      .map((message) => `${message.role === 'user' ? 'Student' : 'Assistant'}: ${message.content}`)
      .join('\n');

    const lang = preferredLanguage || "en";
    const prompt = `You are the LockOnRevision Forge Assistant. You have access to the student's structured learning path (Units, Sub-Units, and Lessons).
Your goal is to help the student navigate their curriculum and master the specific concepts outlined in the Forge structure.

IMPORTANT: Respond ONLY in the user's preferred language: "${lang}". Maintain educational terminology appropriate for that language. Never translate from English afterwards. If the user changes language, immediately continue the conversation in the newly selected language.

CAPABILITIES:
1. Curriculum Guidance: Help the student understand how concepts link across different units and lessons.
2. Concept Clarification: Explain specific lesson concepts using the structure as a map.
3. Active Recall: Generate quick check-on-learning questions based on the units the student is studying.
4. Progress Motivation: Encourage the student to complete locked lessons.

STYLE GUIDELINES:
- Use Markdown for formatting (bolding, lists).
- Be concise, encouraging, and focused on the Forge hierarchy.
- Always reference specific Units or Lessons when applicable.
- End responses with a question that encourages the student to move to the next lesson or test their knowledge.

FORGE LEARNING STRUCTURE:
${structureSummary}

CONVERSATION HISTORY:
${conversation}

Return a JSON object: {"reply": "your markdown-formatted response here"}`;

    const result = await callGeminiWithValidation(prompt);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to get forge assistant reply', error);
    return res.status(500).json({ error: 'The assistant encountered an error. Please try again.' });
  }
});
