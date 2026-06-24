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
    const { sourceText, sourceFileIds = [] } = req.body;

    if (!sourceText) {
      return res.status(400).json({ error: 'Missing required field: sourceText' });
    }

    const prompt = `Analyze the study material and create a structured learning path.
Return strict JSON only with this exact shape:
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
                "keyPoints": ["string"]
              }
            ]
          }
        ]
      }
    ]
  }
}

Requirements:
- Create 2-3 units minimum.
- Each unit must have 2-3 sub-units.
- Each sub-unit must have 2-3 lessons.
- Ground all titles and summaries in the uploaded material.
- Use clear, student-friendly names.

STUDY MATERIAL:
${sourceText}`;

    const fallback = {
      subject: {
        title: 'Generated Subject',
        description: 'AI-generated learning path from your notes.',
        units: [
          {
            title: 'Unit 1',
            summary: 'Core concepts from your notes.',
            subUnits: [
              {
                title: 'Sub Unit 1',
                summary: 'Introduction to key ideas.',
                lessons: [
                  {
                    title: 'Lesson 1',
                    summary: 'Review the main concepts.',
                    keyPoints: ['Key point 1', 'Key point 2'],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = await callGeminiJson(prompt, fallback);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-forge-structure:', error);
    return res.status(500).json({ error: error.message });
  }
}
