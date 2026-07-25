import { GoogleGenerativeAI } from '@google/generative-ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCorsHeaders(res) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
}

let geminiApiKey;
let genAI;
let model;

try {
  geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    console.warn('[ai-tutor-chat] GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
  }
} catch (initError) {
  console.error('[ai-tutor-chat] Module initialization error:', initError.message);
}

function isConfigured() {
  return !!model;
}

async function callGeminiStream(prompt) {
  const result = await model.generateContentStream(prompt);
  return result.stream;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    console.error('[ai-tutor-chat] Gemini API not configured — missing or invalid GEMINI_API_KEY');
    return res.status(200).json({
      reply: "I'm not fully configured yet. Ask an administrator to set the GEMINI_API_KEY environment variable so I can start helping you study!",
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

    const prompt = `You are the LockOn Revision AI Tutor, a world-class educational assistant specializing in active recall and spaced repetition.
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

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const stream = await callGeminiStream(prompt);
    for await (const chunk of stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();
  } catch (error) {
    console.error('[ai-tutor-chat] Error:', error.message);
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
      console.error('[ai-tutor-chat] The GEMINI_API_KEY is invalid or expired.');
    }
    if (!res.headersSent) {
      res.status(200).json({
        reply: "I hit a temporary snag. Please try again in a moment!",
      });
    } else {
      res.write(`\n\n_I hit a snag responding. Please try again._`);
      res.end();
    }
  }
}
