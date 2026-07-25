import { GoogleGenerativeAI } from '@google/generative-ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCorsHeaders(res) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
}

let geminiApiKey;
let genAI;
let model;

try {
  geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    console.warn('[ask-forge-assistant] GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
  }
} catch (initError) {
  console.error('[ask-forge-assistant] Module initialization error:', initError.message);
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
    console.error("JSON parse error:", e, "Original text:", text);
    return { reply: text.replace(/```json\s*|```/gi, '').trim() };
  }
}

async function callGeminiJson(prompt, fallbackValue = null) {
  if (!isConfigured()) {
    if (fallbackValue !== null) return fallbackValue;
    throw new Error('Gemini API is not configured.');
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      if (fallbackValue !== null) return fallbackValue;
      throw new Error('Gemini returned no text.');
    }

    return parseGeminiJson(text);
  } catch (error) {
    console.error('Gemini API error:', error);
    if (fallbackValue !== null) return fallbackValue;
    throw new Error(`Gemini request failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, subjects } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required field: messages' });
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

    const prompt = `You are the LockOn Revision Forge Assistant. You have access to the student's structured learning path (Units, Sub-Units, and Lessons).
Your goal is to help the student navigate their curriculum and master the specific concepts outlined in the Forge structure.

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

    const fallback = {
      reply: subjects && subjects.length
        ? 'I can help you revise your Forge subjects. Ask about a specific unit or lesson.'
        : 'Upload notes in Forge first so I can answer with your study material context.',
    };

    const result = await callGeminiJson(prompt, fallback);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in ask-forge-assistant:', error);
    return res.status(500).json({ error: 'The assistant encountered an error. Please try again.' });
  }
}
