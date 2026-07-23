import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not set. AI functions will fail.');
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: geminiModel }) : null;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function isWeekend(day) {
  return day === "Saturday" || day === "Sunday";
}

function generateAlgorithmicTimetable(prefs) {
  const {
    subjects,
    dailyMinutes,
    weekendMinutes,
    preferredTime,
    durationWeeks = 4,
    examDates: _examDates = [],
  } = prefs;

  const weekMinutes = dailyMinutes * 5 + (weekendMinutes || dailyMinutes) * 2;
  const totalMinutes = weekMinutes * durationWeeks;

  const subjectScores = subjects.map((s) => {
    const diff = ({ easy: 1, medium: 2, hard: 3 })[s.difficulty] || 2;
    const conf = Math.max(1, 10 - (s.confidence || 5));
    return { ...s, weight: diff + conf };
  });

  const totalWeight = subjectScores.reduce((sum, s) => sum + s.weight, 0);
  const subjectAllocation = subjectScores.map((s) => ({
    ...s,
    allocatedMinutes: Math.round((s.weight / totalWeight) * totalMinutes),
  }));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + (1 - startDate.getDay() || 7));
  const weeks = [];

  const subjectQueue = subjectAllocation.map((s) => ({ ...s, remaining: s.allocatedMinutes }));
  let slotCounter = 0;

  for (let w = 0; w < durationWeeks; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const days = {};

    for (const day of DAYS) {
      const dayMin = isWeekend(day) ? (weekendMinutes || dailyMinutes) : dailyMinutes;
      if (dayMin <= 0) continue;

      const slots = [];
      let slotMin = 0;
      const sessionLen = 30;
      const preferredHour = parseInt(preferredTime?.split(":")[0] || 9, 10);

      while (slotMin < dayMin) {
        const available = subjectQueue.filter((s) => s.remaining > 0);
        if (!available.length) break;

        available.sort((a, b) => b.remaining - a.remaining);
        const pick = available[0];
        const sessionMinutes = Math.min(sessionLen, pick.remaining, dayMin - slotMin);

        const startH = preferredHour + Math.floor(slotMin / 60);
        const startM = slotMin % 60;

        slots.push({
          id: `slot-${slotCounter++}`,
          subject: pick.title,
          topic: pick.currentChapter || pick.title,
          duration: sessionMinutes,
          timeSlot: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
          type: slotMin % 60 === 0 ? "revision" : "practice",
        });

        pick.remaining -= sessionMinutes;
        slotMin += sessionMinutes;
      }

      if (slots.length) days[day] = slots;
    }

    weeks.push({ weekNumber: w + 1, startDate: weekStart.toISOString().split("T")[0], days });
  }

  return { weeks, preferences: prefs };
}

async function callGemini(prompt) {
  if (!model) throw new Error("Gemini API is not configured.");
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const preferences = req.body;

    if (!preferences.subjects || !preferences.subjects.length) {
      return res.status(400).json({ error: "At least one subject is required." });
    }

    if (!preferences.dailyMinutes || preferences.dailyMinutes < 15) {
      return res.status(400).json({ error: "Daily study time must be at least 15 minutes." });
    }

    let timetable;

    try {
      const prompt = buildPrompt(preferences);
      const raw = await callGemini(prompt);
      timetable = parseResponse(raw, preferences);
    } catch (aiError) {
      console.error("Gemini timetable generation failed, using algorithmic fallback:", aiError.message);
      timetable = generateAlgorithmicTimetable(preferences);
    }

    return res.status(200).json(timetable);
  } catch (error) {
    console.error("Error in generate-timetable:", error);
    return res.status(500).json({ error: error.message });
  }
}

function buildPrompt(prefs) {
  const {
    grade,
    subjects,
    examDates = [],
    dailyMinutes,
    weekendMinutes,
    preferredTime = "09:00",
    durationWeeks = 4,
  } = prefs;

  const subjectLines = subjects
    .map(
      (s, i) =>
        `${i + 1}. "${s.title}" — difficulty: ${s.difficulty || "medium"}, confidence: ${s.confidence || 5}/10, chapter: "${s.currentChapter || s.title}"`,
    )
    .join("\n");

  const examLines = examDates.length
    ? examDates.map((e) => `- "${e.subject}" on ${e.date}`).join("\n")
    : "None specified yet.";

  return `You are a study timetable planner. Generate a balanced weekly revision timetable in valid JSON.

STUDENT INFO:
- Grade: ${grade || "Not specified"}
- Daily study time: ${dailyMinutes} minutes
- Weekend study time: ${weekendMinutes || dailyMinutes} minutes
- Preferred start time: ${preferredTime}
- Duration: ${durationWeeks} weeks

SUBJECTS (with difficulty, confidence, and current chapter):
${subjectLines}

EXAM DATES:
${examLines}

Rules:
1. Each day must not exceed the available daily/ weekend time.
2. Distribute sessions across subjects proportionally — weaker/lower-confidence subjects get more time.
3. Sessions should be 30–60 minutes each.
4. No single subject should appear more than twice on the same day.
5. Prioritize subjects with upcoming exam dates in the final weeks.
6. Include short breaks (5-10 min) implicitly between sessions.
7. Return ONLY valid JSON — no markdown, no code fences.
8. Response format:
{
  "weeks": [
    {
      "weekNumber": 1,
      "startDate": "YYYY-MM-DD",
      "days": {
        "Monday": [ { "id": "slot-0", "subject": "...", "topic": "...", "duration": 45, "timeSlot": "09:00", "type": "revision" } ],
        "Tuesday": [],
        "Wednesday": [],
        "Thursday": [],
        "Friday": [],
        "Saturday": [],
        "Sunday": []
      }
    }
  ]
}`;
}

function parseResponse(raw, preferences) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
    throw new Error("Invalid response structure: missing weeks array.");
  }

  return { ...parsed, preferences };
}
