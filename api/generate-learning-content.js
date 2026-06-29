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
