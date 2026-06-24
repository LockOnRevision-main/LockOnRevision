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

    const prompt = `You are an expert curriculum designer. Analyze the study material and create a structured learning path.

First, detect the subject (e.g., Biology, Physics, Chemistry, Mathematics, History, Geography, Computer Science, Business, Languages, etc.).

Then create a curriculum-quality hierarchy following this exact JSON structure:
{
  "subject": {
    "title": "string",
    "description": "string",
    "detectedSubject": "string",
    "units": [
      {
        "id": "string",
        "title": "string",
        "summary": "string",
        "order": number,
        "subUnits": [
          {
            "id": "string",
            "title": "string",
            "summary": "string",
            "order": number,
            "lessons": [
              {
                "id": "string",
                "title": "string",
                "summary": "string",
                "concept": "string",
                "durationMinutes": number,
                "xpReward": number,
                "order": number,
                "interactionTypes": ["string"],
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

CRITICAL HIERARCHY REQUIREMENTS:
- Generate 6-15 units (not 2-3)
- Each unit must have 3-8 sub-units (not 2-3)
- Each sub-unit must have 3-10 lessons (not 2-3)
- This creates a deep, comprehensive curriculum

LESSON REQUIREMENTS:
- Each lesson must teach ONE tiny concept (2-5 minutes)
- Duration should be 2-5 minutes per lesson
- XP reward: 10-25 XP per lesson based on complexity
- Concept field: the single specific concept being taught
- Examples of good lesson concepts: "What is a Cell?", "Cell Membrane", "Nucleus", "Mitochondria" (NOT "Everything about Cells")

INTERACTION TYPES (choose based on subject):
For Languages: "multipleChoice", "wordBank", "typeAnswer", "fillBlank", "sentenceOrder", "matchVocabulary"
For Biology: "multipleChoice", "labelDiagram", "identifyStructure", "sequenceProcess", "explainFunction", "imageIdentification"
For Chemistry: "multipleChoice", "balanceEquation", "predictProduct", "molecularStructure", "fillCompound", "periodicTable"
For Physics: "multipleChoice", "numericalAnswer", "formulaSelection", "unitConversion", "graphInterpretation", "scenarioReasoning"
For Mathematics: "multipleChoice", "numericalAnswer", "multiStepWorking", "equationSolving", "patternRecognition", "errorFinding"
For History: "multipleChoice", "timelineOrder", "sourceAnalysis", "causeEffect", "matchEvents", "chronologicalSequence"
For Geography: "multipleChoice", "mapInteraction", "imageRecognition", "climateMatch", "caseStudy", "diagramInterpretation"
For Computer Science: "multipleChoice", "codeCompletion", "debugCode", "predictOutput", "arrangeAlgorithm", "buildSnippet"
For Business/Economics: "multipleChoice", "caseStudy", "decisionMaking", "dataInterpretation", "graphAnalysis", "realWorldScenario"

EXERCISE REQUIREMENTS:
- Generate 3-5 exercises per lesson
- Mix different interaction types appropriate for the subject
- Each exercise must have a clear question
- Multiple choice: provide 4 options
- Include explanation for correct answer
- Make exercises challenging but fair

CURRICULUM QUALITY:
- Group concepts logically (follow real curriculum structure)
- Avoid duplicates and overlapping lessons
- Use clear, student-friendly names
- If the material mentions GCSE, JEE, AP, or other exams, structure accordingly
- Ensure progressive difficulty within units

STUDY MATERIAL:
${sourceText}`;

    const fallback = {
      subject: {
        title: 'Generated Subject',
        description: 'AI-generated learning path from your notes.',
        detectedSubject: 'General',
        units: [
          {
            id: 'unit-1',
            title: 'Unit 1',
            summary: 'Core concepts from your notes.',
            order: 1,
            subUnits: [
              {
                id: 'subunit-1-1',
                title: 'Sub Unit 1',
                summary: 'Introduction to key ideas.',
                order: 1,
                lessons: [
                  {
                    id: 'lesson-1-1-1',
                    title: 'Lesson 1',
                    summary: 'Review the main concepts.',
                    concept: 'Core concept introduction',
                    durationMinutes: 3,
                    xpReward: 15,
                    order: 1,
                    interactionTypes: ['multipleChoice'],
                    exercises: [
                      {
                        type: 'multipleChoice',
                        question: 'What is the main concept?',
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        correctAnswer: 'Option A',
                        explanation: 'Explanation of why this is correct.'
                      }
                    ]
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
