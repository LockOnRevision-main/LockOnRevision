/* global setTimeout */
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not set. AI functions will fail.');
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: geminiModel }) : null;

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

async function callGeminiJson(prompt, fallbackValue = null) {
  if (!model) {
    if (fallbackValue !== null) return fallbackValue;
    throw new Error('Gemini API is not configured.');
  }

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
      lastError = error;
      // Retry on rate limit (429) or server error (500, 503)
      const isRetryable = error.message?.includes('429') || error.message?.includes('500') || error.message?.includes('503');
      if (!isRetryable || attempt === MAX_RETRIES - 1) break;
      
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`Gemini API rate limited or error. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (fallbackValue !== null) return fallbackValue;
  throw new Error(`Gemini request failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, selectedAnswer } = req.body;

    if (!question || !selectedAnswer) {
      return res.status(400).json({ error: 'Missing required fields: question, selectedAnswer' });
    }

    const prompt = `Return JSON only: {"explanation":"brief explanation of why the selected answer is wrong and why the correct answer is right"}
Selected answer: ${selectedAnswer}
Question:
${JSON.stringify(question)}`;

    const fallback = {
      explanation: `The correct answer is "${question.correctAnswer}". Review the lesson summary for more details.`,
    };

    const result = await callGeminiJson(prompt, fallback);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in explain-wrong-answer:', error);
    return res.status(500).json({ error: error.message });
  }
}
