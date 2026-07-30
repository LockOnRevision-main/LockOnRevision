import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

let genAI;
let model;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!geminiApiKey) {
    console.warn("[functions] GEMINI_API_KEY not set. AI functions will fail.");
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
  }
} catch (initError) {
  console.error("[functions] Module initialization error:", initError.message);
}

function isConfigured() {
  return !!model;
}

function createLogger(name) {
  return {
    info: (msg, data) => console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), service: name, message: msg, data })),
    warn: (msg, data) => console.warn(JSON.stringify({ level: "warn", timestamp: new Date().toISOString(), service: name, message: msg, data })),
    error: (msg, err) => console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), service: name, message: msg, error: err?.message })),
  };
}

const log = createLogger("functions");

function withTimeout(promise, ms = 30000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function retry(fn, { maxRetries = 2, baseDelay = 1000, logger } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable = error.message?.includes("429") || error.message?.includes("500") || error.message?.includes("503") || error.message?.includes("timed out") || error.message?.includes("RESOURCE_EXHAUSTED");
      if (attempt >= maxRetries || !isRetryable) break;
      const delay = baseDelay * Math.pow(2, attempt);
      logger?.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, { error: error.message });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function detectTemplatedTitle(title) {
  if (!title || typeof title !== "string") return true;
  return [/^generated\s+(subject|unit|lesson)/i, /^new\s+(unit|sub\s*unit|lesson)/i, /^unit\s+\d+$/i, /^lesson\s+\d+$/i, /^sub\s*unit\s+\d+$/i].some((p) => p.test(title.trim()));
}

function detectPlaceholder(value) {
  if (!value) return false;
  if (typeof value === "string") {
    return [/option\s*a/i, /option\s*b/i, /option\s*c/i, /option\s*d/i, /sample\s*question/i, /example\s*question/i, /placeholder/i].some((p) => p.test(value));
  }
  if (Array.isArray(value)) return value.some((v) => detectPlaceholder(v));
  if (typeof value === "object") return Object.values(value).some((v) => detectPlaceholder(v));
  return false;
}

function validateForgeStructure(data) {
  if (!data || !data.subject) throw new HttpsError("internal", "Response missing subject");
  const subject = data.subject;
  if (!subject.title || typeof subject.title !== "string" || subject.title.trim().length === 0) throw new HttpsError("internal", "Subject title is empty");
  if (detectTemplatedTitle(subject.title)) throw new HttpsError("internal", "Subject title is a placeholder");

  const units = subject.units;
  if (!Array.isArray(units) || units.length < 2) throw new HttpsError("internal", "Need at least 2 units");

  for (const unit of units) {
    if (!unit.title || detectTemplatedTitle(unit.title)) throw new HttpsError("internal", `Unit title "${unit.title}" is invalid`);
    const subUnits = unit.subUnits;
    if (!Array.isArray(subUnits) || subUnits.length === 0) throw new HttpsError("internal", `Unit "${unit.title}" has no sub-units`);
    for (const subUnit of subUnits) {
      if (!subUnit.title || detectTemplatedTitle(subUnit.title)) throw new HttpsError("internal", `Sub-unit title is invalid`);
      const lessons = subUnit.lessons;
      if (!Array.isArray(lessons) || lessons.length === 0) throw new HttpsError("internal", `Sub-unit "${subUnit.title}" has no lessons`);
    }
  }

  if (detectPlaceholder(data)) throw new HttpsError("internal", "Response contains placeholder content");
}

function validateLearningContent(data) {
  if (!data || !Array.isArray(data.subjects) || data.subjects.length === 0) throw new HttpsError("internal", "Response missing subjects");
  for (const subject of data.subjects) {
    if (!subject.title || detectTemplatedTitle(subject.title)) throw new HttpsError("internal", "Subject title is invalid");
    const units = subject.units;
    if (!Array.isArray(units) || units.length === 0) throw new HttpsError("internal", `Subject "${subject.title}" has no units`);
    for (const unit of units) {
      const lessons = unit.lessons;
      if (!Array.isArray(lessons) || lessons.length === 0) throw new HttpsError("internal", `Unit "${unit.title}" has no lessons`);
      for (const lesson of lessons) {
        if (!lesson.title || detectTemplatedTitle(lesson.title)) throw new HttpsError("internal", "Lesson title is invalid");
        if (!Array.isArray(lesson.questions) || lesson.questions.length === 0) throw new HttpsError("internal", `Lesson "${lesson.title}" has no questions`);
      }
    }
  }
  if (detectPlaceholder(data)) throw new HttpsError("internal", "Response contains placeholder content");
}

async function callGeminiWithValidation(prompt, validateFn) {
  if (!isConfigured()) {
    throw new HttpsError("unavailable", "Gemini API is not configured. Set GEMINI_API_KEY in Firebase config.");
  }

  log.info("Calling Gemini", { promptLength: prompt.length });

  const result = await withTimeout(retry(() => model.generateContent(prompt), { logger: log }), 45000);
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new HttpsError("internal", "Gemini returned empty response");
  }

  log.info("Gemini response received", { length: text.length });

  const parsed = parseGeminiJson(text);
  validateFn(parsed);

  log.info("Response validated successfully");
  return parsed;
}

async function verifyAuthenticated(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "You must be authenticated to call this function.");
  }
  return context.auth.uid;
}

async function verifyAdmin(context) {
  const uid = await verifyAuthenticated(context);
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const data = userDoc.data();
  if (data.isAdmin !== true && data.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return uid;
}

function validateRequest(data, requiredFields = []) {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new HttpsError("invalid-argument", `Missing required field: ${field}`);
    }
  }
}

export const generateForgeStructure = onCall(async (request) => {
  await verifyAuthenticated(request);
  validateRequest(request.data, ["sourceText"]);
  const { sourceText } = request.data;

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

  return await callGeminiWithValidation(prompt, validateForgeStructure);
});

export const generateLearningContent = onCall(async (request) => {
  await verifyAuthenticated(request);
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

  return await callGeminiWithValidation(prompt, validateLearningContent);
});

export const aiTutorChat = onCall(async (request) => {
  await verifyAuthenticated(request);
  validateRequest(request.data, ["messages"]);
  const { messages, context } = request.data;

  const conversation = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const contextStr = context ? `\n\nContext:\n${JSON.stringify(context)}` : "";

  const prompt = `You are LockOnRevision's AI tutor. Be concise, helpful, and active-recall focused.
Return JSON only: {"reply":"string"}

Conversation:
${conversation}${contextStr}`;

  if (!isConfigured()) {
    throw new HttpsError("unavailable", "Gemini API is not configured. Set GEMINI_API_KEY in Firebase config.");
  }

  log.info("Calling Gemini for AI tutor chat");
  const result = await withTimeout(retry(() => model.generateContent(prompt), { logger: log }), 30000);
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new HttpsError("internal", "Gemini returned empty response");
  }

  const parsed = parseGeminiJson(text);
  if (!parsed.reply || typeof parsed.reply !== "string") {
    throw new HttpsError("internal", "Invalid tutor response format");
  }

  return parsed;
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

  if (!isConfigured()) {
    throw new HttpsError("unavailable", "Gemini API is not configured. Set GEMINI_API_KEY in Firebase config.");
  }

  log.info("Calling Gemini for question hint");
  const result = await withTimeout(retry(() => model.generateContent(prompt), { maxRetries: 2, baseDelay: 1000, logger: log }), 15000);
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new HttpsError("internal", "Gemini returned empty response");
  }

  const parsed = parseGeminiJson(text);
  if (!parsed.hint || typeof parsed.hint !== "string") {
    throw new HttpsError("internal", "Invalid hint response format");
  }

  return parsed;
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

  if (!isConfigured()) {
    throw new HttpsError("unavailable", "Gemini API is not configured. Set GEMINI_API_KEY in Firebase config.");
  }

  log.info("Calling Gemini for wrong answer explanation");
  const result = await withTimeout(retry(() => model.generateContent(prompt), { maxRetries: 3, baseDelay: 1000, logger: log }), 15000);
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new HttpsError("internal", "Gemini returned empty response");
  }

  const parsed = parseGeminiJson(text);
  if (!parsed.explanation || typeof parsed.explanation !== "string") {
    throw new HttpsError("internal", "Invalid explanation response format");
  }

  return parsed;
});

export const askForgeAssistant = onCall(async (request) => {
  const uid = await verifyAuthenticated(request);
  validateRequest(request.data, ["messages"]);
  const { messages } = request.data;

  const subjectsSnap = await db.collection("users").doc(uid).collection("subjects").where("forge", "==", true).get();

  const subjects = subjectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const structureSummary = subjects.length
    ? subjects
        .map((subject) => {
          const units = (subject.units || []).map((unit) => `Unit: ${unit.title}`).join("\n");
          return `Subject: ${subject.title}\n${units}`;
        })
        .join("\n\n")
    : "No Forge subjects have been generated yet.";

  const conversation = messages.map((message) => `${message.role === "user" ? "Student" : "Assistant"}: ${message.content}`).join("\n");

  const prompt = `You are LockOnRevision's AI study assistant.
Answer using the student's uploaded study material and generated Forge learning structure whenever possible.
Be concise, encouraging, and focused on active recall.

Generated learning structure:
${structureSummary}

Conversation:
${conversation}

Return strict JSON only: {"reply":"your response here"}`;

  if (!isConfigured()) {
    throw new HttpsError("unavailable", "Gemini API is not configured. Set GEMINI_API_KEY in Firebase config.");
  }

  log.info("Calling Gemini for forge assistant");
  const result = await withTimeout(retry(() => model.generateContent(prompt), { logger: log }), 30000);
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new HttpsError("internal", "Gemini returned empty response");
  }

  const parsed = parseGeminiJson(text);
  if (!parsed.reply || typeof parsed.reply !== "string") {
    throw new HttpsError("internal", "Invalid assistant response format");
  }

  return parsed;
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
  const sourceText = file.content || `File: ${file.name}. Uploaded URL: ${file.url || "unavailable"}.`;

  if (!isConfigured()) {
    throw new HttpsError("unavailable", "Gemini API is not configured. Set GEMINI_API_KEY in Firebase config.");
  }

  log.info("Calling Gemini for uploaded notes processing");
  const generated = await callGeminiWithValidation(
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
    validateLearningContent,
  );

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

export const verifyAdminAccess = onCall(async (request) => {
  await verifyAdmin(request);
  return { admin: true };
});
