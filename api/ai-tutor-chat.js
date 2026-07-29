import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger, withTimeout, retry } from './lib/forge-integrity.js';
import { requireAuth } from './lib/auth.js';

const log = createLogger('ai-tutor-chat');

let genAI;
let model;
let initError = null;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    initError = 'GEMINI_API_KEY environment variable is not set';
    log.warn(initError);
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
    log.info('Gemini initialized', { model: geminiModel });
  }
} catch (e) {
  initError = e.message;
  log.error('Module initialization error', e);
}

function isConfigured() {
  return !!model;
}

async function callGemini(prompt) {
  if (!model) throw new Error(initError || 'Gemini not initialized');

  const result = await withTimeout(
    retry(() => model.generateContent(prompt), { logger: log }),
    45000
  );
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  return text;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    log.error('Gemini not configured', { reason: initError });
    return res.status(503).json({
      error: initError || 'Gemini API is not configured.',
      code: 'gemini_not_configured',
    });
  }

  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required field: messages' });
    }

    const conversation = messages.map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join('\n');

    const profileStr = context?.profile
      ? `
- Name: ${context.profile.name}
- Level: ${context.profile.level} (${context.profile.rank})
- XP: ${context.profile.xp}
- Energy: ${context.profile.energy}
- Streak: ${context.profile.streak} days
- Study hours: ${context.profile.totalStudyHours}h
- Completed lessons: ${context.profile.completedLessons}
- Completed units: ${context.profile.completedUnits}
- Goals: ${context.profile.goals || "Not set"}`
      : "";

    const curriculumStr = context?.curriculum
      ? `
- Subjects: ${context.curriculum.subjects.map((s) => `${s.title} (${s.progress?.percent || 0}%)`).join(", ") || "None yet"}
- Strong subjects: ${context.curriculum.strongSubjects.join(", ") || "N/A"}
- Weak subjects: ${context.curriculum.weakSubjects.join(", ") || "N/A"}
- Overall progress: ${context.curriculum.overallProgress.completedLessons}/${context.curriculum.overallProgress.totalLessons} lessons (${context.curriculum.overallProgress.percent}%)`
      : "";

    const subjectDetails = context?.forgeContext?.subjects?.length
      ? context.forgeContext.subjects.map((s) => {
          const units = (s.units || []).map((u) => {
            const unitLessons = (u.subUnits || []).flatMap((su) => su.lessons || []);
            const done = unitLessons.filter((l) => l.completed).length;
            return `${u.title} (${done}/${unitLessons.length})`;
          }).join("; ");
          return `  - ${s.title}: ${units || "No units"}`;
        }).join("\n")
      : "None";

    const prompt = `You are the LockOnRevision AI Tutor, a world-class educational assistant specializing in active recall and spaced repetition.
Your goal is to help students master their material through guided learning, not just giving answers.

STUDENT PROFILE:
${profileStr || "New learner — no profile data yet."}

CURRICULUM PROGRESS:
${curriculumStr || "No curriculum data available."}

STUDY MATERIAL:
${subjectDetails || "No study material uploaded yet."}

CAPABILITIES:
1. Explain Concepts: Break down complex ideas into simple, digestible parts. Use analogies.
2. Generate Quizzes: Create challenging active-recall questions (MCQs, Short Answer, True/False) based on the context.
3. Generate Summaries: Provide concise, high-impact summaries of study materials.
4. Homework Help: Guide students to the answer by asking leading questions rather than just providing the solution.
5. Reference Materials: Always prioritize the provided STUDY MATERIAL. If the answer isn't there, state that it's not in the notes but provide a general helpful answer.

STYLE GUIDELINES:
- Be concise, encouraging, and academic yet accessible.
- Use Markdown for formatting (bolding, lists, tables, math notation with $$).
- If the student is struggling, offer a simpler explanation.
- End responses with a follow-up question to keep the student engaged.
- Tailor explanations to the student's level and progress.
- Reference their specific subjects, units, and lessons when giving advice.
- If they have weak subjects, suggest revisiting those.
- Congratulate them on streaks and milestones naturally.

CONVERSATION HISTORY:
${conversation}

Please provide your response in plain text (Markdown). Do not wrap it in JSON.`;

    log.info('Calling Gemini for AI tutor chat');
    const reply = await callGemini(prompt);
    log.info('Gemini response received', { length: reply.length });

    return res.status(200).json({ reply });
  } catch (error) {
    log.error('AI tutor chat error', { message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') });
    return res.status(200).json({
      reply: "The AI tutor is temporarily unavailable. Please try again in a moment.",
    });
  }
}

export default requireAuth(handler);
