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
    const { sourceText } = req.body;

    if (!sourceText) {
      return res.status(400).json({ error: 'Missing required field: sourceText' });
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
          "subUnits": [
            {
              "title": "string",
              "summary": "string",
              "lessons": [
                {
                  "title": "string",
                  "summary": "string",
                  "explanation": "string",
                  "difficulty": "easy|medium|hard",
                  "exercises": [
                    {
                      "type": "multipleChoice|wordBank|fillBlank|typeAnswer|matchPairs|trueFalse|ordering",
                      "question": "string",
                      "content": "string (or object depending on type)",
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
  ]
}

REQUIREMENTS:
1. Hierarchy: Unit -> Sub Unit -> Lesson.
2. Exercises: Generate diverse exercises using the specified types.
3. Content: Grounded strictly in the notes.
4. Explanations: Provide detailed explanations for every exercise.
5. Adaptability: Adjust difficulty and interaction type to the subject.

NOTES:
${sourceText}`;

    const fallback = {
      subjects: [
        {
          title: 'My Notes',
          description: 'Generated from your notes.',
          units: [
            {
              title: 'Unit 1',
              summary: 'Core ideas from your notes.',
              lessons: [
                {
                  title: 'Lesson 1',
                  summary: 'Review the main idea and test yourself.',
                  difficulty: 'medium',
                  keyPoints: ['Key point 1'],
                  questions: [
                    {
                      prompt: 'What is the main idea?',
                      options: ['Option A', 'Option B', 'Option C', 'Option D'],
                      correctAnswer: 'Option A',
                      explanation: 'The correct answer is grounded in the notes.',
                      topic: 'Main idea',
                      difficulty: 'medium',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = await callGeminiJson(prompt, fallback);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-learning-content:', error);
    return res.status(500).json({ error: error.message });
  }
}
