import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  onCall,
  HttpsError,
} from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

if (!geminiApiKey) {
  console.warn("GEMINI_API_KEY not set. AI functions will fail.");
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: geminiModel }) : null;

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGeminiJson(prompt, fallbackValue = null) {
  if (!model) {
    if (fallbackValue !== null) return fallbackValue;
    throw new HttpsError("unavailable", "Gemini API is not configured.");
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      if (fallbackValue !== null) return fallbackValue;
      throw new HttpsError("internal", "Gemini returned no text.");
    }

    return parseGeminiJson(text);
  } catch (error) {
    console.error("Gemini API error:", error);
    if (fallbackValue !== null) return fallbackValue;
    throw new HttpsError("internal", `Gemini request failed: ${error.message}`);
  }
}

async function callGeminiText(prompt, fallbackText = "") {
  if (!model) {
    if (fallbackText) return fallbackText;
    throw new HttpsError("unavailable", "Gemini API is not configured.");
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      if (fallbackText) return fallbackText;
      throw new HttpsError("internal", "Gemini returned no text.");
    }

    return text;
  } catch (error) {
    console.error("Gemini API error:", error);
    if (fallbackText) return fallbackText;
    throw new HttpsError("internal", `Gemini request failed: ${error.message}`);
  }
}

async function verifyAuthenticated(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "You must be authenticated to call this function.");
  }
  return context.auth.uid;
}

function validateRequest(data, requiredFields = []) {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new HttpsError("invalid-argument", `Missing required field: ${field}`);
    }
  }
}

export const generateForgeStructure = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["sourceText"]);

  const { sourceText, sourceFileIds = [] } = request.data;

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
      title: "Generated Subject",
      description: "AI-generated learning path from your notes.",
      units: [
        {
          title: "Unit 1",
          summary: "Core concepts from your notes.",
          subUnits: [
            {
              title: "Sub Unit 1",
              summary: "Introduction to key ideas.",
              lessons: [
                {
                  title: "Lesson 1",
                  summary: "Review the main concepts.",
                  keyPoints: ["Key point 1", "Key point 2"],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return await callGeminiJson(prompt, fallback);
});

export const generateLearningContent = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["sourceText"]);

  const { sourceText } = request.data;

  const prompt = `Create structured active-recall learning content from these notes.
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
              "difficulty": "easy|medium|hard",
              "keyPoints": ["string"],
              "questions": [
                {
                  "prompt": "string",
                  "options": ["A", "B", "C", "D"],
                  "correctAnswer": "must exactly match one option",
                  "explanation": "string",
                  "topic": "string",
                  "difficulty": "easy|medium|hard"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
Create concise lessons, 3-5 recall questions per lesson, and only use facts grounded in the notes.

NOTES:
${sourceText}`;

  const fallback = {
    subjects: [
      {
        title: "My Notes",
        description: "Generated from your notes.",
        units: [
          {
            title: "Unit 1",
            summary: "Core ideas from your notes.",
            lessons: [
              {
                title: "Lesson 1",
                summary: "Review the main idea and test yourself.",
                difficulty: "medium",
                keyPoints: ["Key point 1"],
                questions: [
                  {
                    prompt: "What is the main idea?",
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correctAnswer: "Option A",
                    explanation: "The correct answer is grounded in the notes.",
                    topic: "Main idea",
                    difficulty: "medium",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return await callGeminiJson(prompt, fallback);
});

export const aiTutorChat = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["messages"]);

  const { messages, context } = request.data;

  const conversation = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const contextStr = context ? `\n\nContext:\n${JSON.stringify(context)}` : "";

  const prompt = `You are LockOn Revision's AI tutor. Be concise, helpful, and active-recall focused.
Return JSON only: {"reply":"string"}

Conversation:
${conversation}${contextStr}`;

  const fallback = {
    reply: "I'm here to help you learn. Ask me a question about your study material.",
  };

  return await callGeminiJson(prompt, fallback);
});

export const generateQuestionHint = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["questionId"]);

  const { questionId } = request.data;

  const questionDoc = await db.collection("users").doc(uid).collection("questions").doc(questionId).get();
  if (!questionDoc.exists) {
    throw new HttpsError("not-found", "Question not found.");
  }

  const question = questionDoc.data();

  const prompt = `Return JSON only: {"hint":"one short hint that helps without revealing the answer"}
Question:
${JSON.stringify(question)}`;

  const fallback = {
    hint: "Eliminate the least relevant options first.",
  };

  return await callGeminiJson(prompt, fallback);
});

export const explainWrongAnswer = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["questionId", "selectedAnswer"]);

  const { questionId, selectedAnswer } = request.data;

  const questionDoc = await db.collection("users").doc(uid).collection("questions").doc(questionId).get();
  if (!questionDoc.exists) {
    throw new HttpsError("not-found", "Question not found.");
  }

  const question = questionDoc.data();

  const prompt = `Return JSON only: {"explanation":"brief explanation of why the selected answer is wrong and why the correct answer is right"}
Selected answer: ${selectedAnswer}
Question:
${JSON.stringify(question)}`;

  const fallback = {
    explanation: `The correct answer is "${question.correctAnswer}". Review the lesson summary for more details.`,
  };

  return await callGeminiJson(prompt, fallback);
});

export const askForgeAssistant = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["messages"]);

  const { messages } = request.data;

  const subjectsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("subjects")
    .where("forge", "==", true)
    .get();

  const subjects = subjectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const structureSummary = subjects.length
    ? subjects
        .map((subject) => {
          const units = (subject.units || []).map((unit) => `Unit: ${unit.title}`).join("\n");
          return `Subject: ${subject.title}\n${units}`;
        })
        .join("\n\n")
    : "No Forge subjects have been generated yet.";

  const conversation = messages
    .map((message) => `${message.role === "user" ? "Student" : "Assistant"}: ${message.content}`)
    .join("\n");

  const prompt = `You are LockOn Revision's AI study assistant.
Answer using the student's uploaded study material and generated Forge learning structure whenever possible.
Be concise, encouraging, and focused on active recall.

Generated learning structure:
${structureSummary}

Conversation:
${conversation}

Return strict JSON only: {"reply":"your response here"}`;

  const fallback = {
    reply: subjects.length
      ? "I can help you revise your Forge subjects. Ask about a specific unit or lesson."
      : "Upload notes in Forge first so I can answer with your study material context.",
  };

  return await callGeminiJson(prompt, fallback);
});

export const processUploadedNotes = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["fileId"]);

  const { fileId } = request.data;

  const fileDoc = await db.collection("users").doc(uid).collection("files").doc(fileId).get();
  if (!fileDoc.exists) {
    throw new HttpsError("not-found", "File not found.");
  }

  const file = fileDoc.data();

  let sourceText = "";
  if (file.content) {
    sourceText = file.content;
  } else if (file.storagePath) {
    try {
      const bucket = storage.bucket();
      const fileRef = bucket.file(file.storagePath);
      const [exists] = await fileRef.exists();
      if (exists) {
        const [contents] = await fileRef.download();
        sourceText = contents.toString("utf-8");
      }
    } catch (error) {
      console.error("Error reading file from storage:", error);
      sourceText = `File: ${file.name}`;
    }
  }

  if (!sourceText) {
    sourceText = `File: ${file.name}`;
  }

  const generated = await callGeminiJson(
    `Create structured active-recall learning content from these notes.
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
              "difficulty": "easy|medium|hard",
              "keyPoints": ["string"],
              "questions": [
                {
                  "prompt": "string",
                  "options": ["A", "B", "C", "D"],
                  "correctAnswer": "must exactly match one option",
                  "explanation": "string",
                  "topic": "string",
                  "difficulty": "easy|medium|hard"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
Create concise lessons, 3-5 recall questions per lesson, and only use facts grounded in the notes.

NOTES:
${sourceText}`,
    null
  );

  if (!generated || !generated.subjects || !generated.subjects.length) {
    throw new HttpsError("internal", "Failed to generate learning content.");
  }

  const created = {
    subjects: [],
    units: [],
    lessons: [],
    questions: [],
  };

  for (const subjectInput of generated.subjects) {
    const subjectRef = await db.collection("users").doc(uid).collection("subjects").add({
      title: subjectInput.title || "Generated Subject",
      description: subjectInput.description || "Generated from your notes.",
      unitCount: subjectInput.units?.length || 0,
      sourceFileId: fileId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created.subjects.push(subjectRef.id);

    for (const unitInput of subjectInput.units || []) {
      const unitRef = await db.collection("users").doc(uid).collection("units").add({
        subjectId: subjectRef.id,
        subjectName: subjectInput.title || "Generated Subject",
        title: unitInput.title || "Generated Unit",
        summary: unitInput.summary || "",
        sourceFileId: fileId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      created.units.push(unitRef.id);

      for (const lessonInput of unitInput.lessons || []) {
        const lessonRef = await db.collection("users").doc(uid).collection("lessons").add({
          subjectId: subjectRef.id,
          unitId: unitRef.id,
          subjectName: subjectInput.title || "Generated Subject",
          unitName: unitInput.title || "Generated Unit",
          title: lessonInput.title || "Generated Lesson",
          summary: lessonInput.summary || "",
          keyPoints: lessonInput.keyPoints || [],
          mastery: 45,
          difficulty: lessonInput.difficulty || "medium",
          sourceFileId: fileId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        created.lessons.push(lessonRef.id);

        for (const questionInput of lessonInput.questions || []) {
          const options = Array.isArray(questionInput.options) ? questionInput.options.slice(0, 4) : [];
          const questionRef = await db.collection("users").doc(uid).collection("questions").add({
            subjectId: subjectRef.id,
            unitId: unitRef.id,
            lessonId: lessonRef.id,
            subjectName: subjectInput.title || "Generated Subject",
            unitName: unitInput.title || "Generated Unit",
            lessonTitle: lessonInput.title || "Generated Lesson",
            prompt: questionInput.prompt || `What is the key idea in ${lessonInput.title || "this lesson"}?`,
            options,
            correctAnswer: questionInput.correctAnswer || options[0],
            explanation: questionInput.explanation || "",
            topic: questionInput.topic || lessonInput.title || "Generated Lesson",
            difficulty: questionInput.difficulty || lessonInput.difficulty || "medium",
            mastery: 45,
            attempts: 0,
            correctAttempts: 0,
            sourceFileId: fileId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          created.questions.push(questionRef.id);
        }
      }
    }
  }

  await db.collection("users").doc(uid).update({
    "dailyUsage.aiRequests": FieldValue.increment(1),
    "dailyUsage.uploadsProcessed": FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, created };
});
