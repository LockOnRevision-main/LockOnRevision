/**
 * Beta 2.0 Part 2 — Stage 0.5: AI/timetable dispatcher (companion to
 * api/school.js — see that file for the rationale). Delegates to the
 * handler modules under server/handlers/ (imported, never copied).
 */
import aiStatus from "../server/handlers/ai-status.js";
import aiTutorChat from "../server/handlers/ai-tutor-chat.js";
import askForgeAssistant from "../server/handlers/ask-forge-assistant.js";
import generateForgeStructure from "../server/handlers/generate-forge-structure.js";
import processUploadedNotes from "../server/handlers/process-uploaded-notes.js";
import extractTimetableDocs from "../server/handlers/extract-timetable-docs.js";
import generateLearningContent from "../server/handlers/generate-learning-content.js";
import generateQuestionHint from "../server/handlers/generate-question-hint.js";
import explainWrongAnswer from "../server/handlers/explain-wrong-answer.js";
import generateTimetable from "../server/handlers/generate-timetable.js";
import generateDailyChallenge from "../server/handlers/generate-daily-challenge.js";
import deleteCloudinaryFiles from "../server/handlers/delete-cloudinary-files.js";

export const ACTIONS = {
  "ai-status": aiStatus,
  "ai-tutor-chat": aiTutorChat,
  "ask-forge-assistant": askForgeAssistant,
  "generate-forge-structure": generateForgeStructure,
  "process-uploaded-notes": processUploadedNotes,
  "extract-timetable-docs": extractTimetableDocs,
  "generate-learning-content": generateLearningContent,
  "generate-question-hint": generateQuestionHint,
  "explain-wrong-answer": explainWrongAnswer,
  "generate-timetable": generateTimetable,
  "generate-daily-challenge": generateDailyChallenge,
  "delete-cloudinary-files": deleteCloudinaryFiles,
};

export default async function handler(req, res) {
  const action = req.query?.action || req.body?.action;
  const fn = typeof action === "string" ? ACTIONS[action] : null;
  if (!fn) return res.status(404).json({ error: "Unknown action." });
  return fn(req, res);
}
