const SCORE_CHANGED = "leaderboard:score-changed";
const LESSON_COMPLETED = "forge:lesson-completed";
const SESSION_COMPLETED = "timetable:session-completed";
const SESSION_SKIPPED = "timetable:session-skipped";
const TIMETABLE_UPDATED = "timetable:updated";
const ENERGY_CHANGED = "energy:changed";
const ENERGY_SPENT = "energy:spent";

export function emitScoreChanged(detail) {
  window.dispatchEvent(new CustomEvent(SCORE_CHANGED, { detail }));
}

export function onScoreChanged(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(SCORE_CHANGED, handler);
  return () => window.removeEventListener(SCORE_CHANGED, handler);
}

export function emitLessonCompleted(detail) {
  window.dispatchEvent(new CustomEvent(LESSON_COMPLETED, { detail }));
}

export function onLessonCompleted(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(LESSON_COMPLETED, handler);
  return () => window.removeEventListener(LESSON_COMPLETED, handler);
}

export function emitSessionCompleted(detail) {
  window.dispatchEvent(new CustomEvent(SESSION_COMPLETED, { detail }));
}

export function onSessionCompleted(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(SESSION_COMPLETED, handler);
  return () => window.removeEventListener(SESSION_COMPLETED, handler);
}

export function emitSessionSkipped(detail) {
  window.dispatchEvent(new CustomEvent(SESSION_SKIPPED, { detail }));
}

export function onSessionSkipped(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(SESSION_SKIPPED, handler);
  return () => window.removeEventListener(SESSION_SKIPPED, handler);
}

export function emitTimetableUpdated(detail) {
  window.dispatchEvent(new CustomEvent(TIMETABLE_UPDATED, { detail }));
}

export function onTimetableUpdated(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(TIMETABLE_UPDATED, handler);
  return () => window.removeEventListener(TIMETABLE_UPDATED, handler);
}

export function emitEnergyChanged(detail) {
  window.dispatchEvent(new CustomEvent(ENERGY_CHANGED, { detail }));
}

export function onEnergyChanged(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(ENERGY_CHANGED, handler);
  return () => window.removeEventListener(ENERGY_CHANGED, handler);
}

export function emitEnergySpent(detail) {
  window.dispatchEvent(new CustomEvent(ENERGY_SPENT, { detail }));
}

export function onEnergySpent(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(ENERGY_SPENT, handler);
  return () => window.removeEventListener(ENERGY_SPENT, handler);
}
