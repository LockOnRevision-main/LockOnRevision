import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not set. AI functions will fail.');
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: geminiModel }) : null;

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function callGeminiJson(prompt, fallbackValue = null) {
  if (!model) {
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

    const prompt = `You are LockOn Revision's AI study assistant.
Answer using the student's uploaded study material and generated Forge learning structure whenever possible.
Be concise, encouraging, and focused on active recall.

Generated learning structure:
${structureSummary}

Conversation:
${conversation}

Return strict JSON only: {"reply":"your response here"}`;

    const fallback = {
      reply: subjects && subjects.length
        ? 'I can help you revise your Forge subjects. Ask about a specific unit or lesson.'
        : 'Upload notes in Forge first so I can answer with your study material context.',
    };

    const result = await callGeminiJson(prompt, fallback);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in ask-forge-assistant:', error);
    return res.status(500).json({ error: error.message });
  }
}
