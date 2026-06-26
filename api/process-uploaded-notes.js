import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL;

if (!geminiApiKey || !geminiModel) {
  console.error('GEMINI_API_KEY or GEMINI_MODEL not set.');
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: geminiModel }) : null;

function validateGeminiResponse(data) {
  if (!data || !data.subjects || !Array.isArray(data.subjects)) {
    throw new Error('Invalid Gemini response structure.');
  }
  // Further validation can be added here.
  return true;
}

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

    const parsed = parseGeminiJson(text);
    validateGeminiResponse(parsed);
    return parsed;
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
    const { sourceText } = req.body;

    if (!sourceText) {
      return res.status(400).json({ error: 'Missing required field: sourceText' });
    }

    const generated = await callGeminiJson(
      `You are an expert educational AI. Your goal is to transform user-uploaded study notes into a premium, interactive, and structured learning experience that feels like a professional educational platform.

Analyze the provided notes and generate a highly structured JSON response representing a complete subject curriculum.

Follow these strict requirements:
1. Subject Analysis: Identify the primary subject, curriculum, and target syllabus level.
2. Structure: Break down the content into logical Units -> Subunits -> Lessons.
3. Lessons: Every lesson must be focused, active-recall-oriented, and designed for 2-5 minutes of engagement.
4. Lesson Types: Use diverse interaction types (multipleChoice, fillBlank, matchPairs, arrangeOrder, etc.) appropriate to the subject matter.
5. Interactive Exercises: For each lesson, generate 3-5 rigorous, high-quality exercises that reinforce understanding.
6. Validation: Every exercise must have a clear "correctAnswer" from the provided options and a concise, educational "explanation".

Return ONLY valid JSON with this structure:
{
  "subject": {
    "title": "string",
    "description": "string",
    "units": [
      {
        "title": "string",
        "summary": "string",
        "subUnits": [
          {
            "title": "string",
            "summary": "string",
            "lessons": [
              {
                "title": "string",
                "summary": "string",
                "concept": "string",
                "difficulty": "easy|medium|hard",
                "interactionTypes": ["multipleChoice", "fillBlank", "matchPairs", "arrangeOrder"],
                "keyPoints": ["string"],
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

STUDY NOTES:
${sourceText}`,
      null
    );

    if (!generated || !generated.subjects || !generated.subjects.length) {
      throw new Error('Failed to generate learning content.');
    }

    return res.status(200).json({ ok: true, data: generated });
  } catch (error) {
    console.error('Error in process-uploaded-notes:', error);
    return res.status(500).json({ error: error.message });
  }
}
