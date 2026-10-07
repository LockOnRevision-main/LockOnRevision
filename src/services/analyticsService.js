import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { getLocalUser } from "./localStore.js";

/** Robustly convert Firestore Timestamp / ISO string / epoch millis to Date. */
export function toDate(value) {
  try {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === "function") {
      const d = value.toDate();
      return d && !isNaN(d.getTime()) ? d : null;
    }
    if (typeof value === "number") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

export function dayKey(date) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

/** Per-subject progress rollup from existing Forge collections. */
export function computeSubjectBreakdown(subjects = [], lessons = [], questions = []) {
  const bySubject = new Map();
  for (const s of subjects) {
    bySubject.set(s.id, {
      id: s.id,
      title: s.title || "Untitled subject",
      total: 0,
      completed: 0,
      xp: 0,
      perfect: 0,
      masterySum: 0,
      masteryCount: 0,
    });
  }
  for (const l of lessons) {
    const key = l.subjectId;
    if (!key || !bySubject.has(key)) continue;
    const row = bySubject.get(key);
    row.total += 1;
    if (l.completed) {
      row.completed += 1;
      row.xp += Number(l.xpEarned || 0);
      if (l.perfect) row.perfect += 1;
    }
    if (typeof l.mastery === "number") {
      row.masterySum += l.mastery;
      row.masteryCount += 1;
    }
  }
  // Weak topics per subject from question mastery (< 70), top 3 by lowest mastery.
  const weakBySubject = new Map();
  for (const q of questions) {
    if (typeof q.mastery !== "number" || q.mastery >= 70) continue;
    const sid = q.subjectId;
    if (!sid || !bySubject.has(sid)) continue;
    if (!weakBySubject.has(sid)) weakBySubject.set(sid, new Map());
    const topics = weakBySubject.get(sid);
    const topic = q.topic || q.prompt || "Untitled topic";
    const prev = topics.get(topic);
    if (!prev || q.mastery < prev.mastery) topics.set(topic, { topic, mastery: q.mastery });
  }
  return [...bySubject.values()].map((row) => ({
    ...row,
    percent: row.total ? Math.round((row.completed / row.total) * 100) : 0,
    avgMastery: row.masteryCount ? Math.round(row.masterySum / row.masteryCount) : null,
    weakTopics: [...(weakBySubject.get(row.id)?.values() || [])]
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3),
  }));
}

/** Lessons completed + XP earned per week for the last `weeks` weeks. */
export function computeWeeklyTrend(lessons = [], weeks = 8) {
  const start = mondayOf(new Date());
  start.setDate(start.getDate() - (weeks - 1) * 7);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return { weekStart: d, label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), lessons: 0, xp: 0, perfect: 0 };
  });
  for (const l of lessons) {
    if (!l.completed) continue;
    const d = toDate(l.completedAt || l.updatedAt);
    if (!d) continue;
    const idx = Math.floor((mondayOf(d).getTime() - start.getTime()) / (7 * 864e5));
    if (idx < 0 || idx >= weeks) continue;
    buckets[idx].lessons += 1;
    buckets[idx].xp += Number(l.xpEarned || 0);
    if (l.perfect) buckets[idx].perfect += 1;
  }
  return buckets;
}

/** Perfect-lesson rate + average question mastery (honest, available-data proxies). */
export function computePerformance(lessons = [], questions = []) {
  const done = lessons.filter((l) => l.completed);
  const perfect = done.filter((l) => l.perfect).length;
  const withMastery = questions.filter((q) => typeof q.mastery === "number");
  return {
    completedLessons: done.length,
    perfectLessons: perfect,
    perfectRate: done.length ? Math.round((perfect / done.length) * 100) : null,
    avgMastery: withMastery.length
      ? Math.round(withMastery.reduce((s, q) => s + q.mastery, 0) / withMastery.length)
      : null,
    topicsTracked: withMastery.length,
  };
}

/** Consistency from the profile activity map ({yyyy-mm-dd: hours}). */
export function computeConsistency(activity = {}) {
  const today = new Date();
  let activeDays = 0;
  let hours = 0;
  const last7 = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const h = Number(activity[dayKey(d)] || 0);
    if (h > 0) activeDays += 1;
    hours += h;
    if (i < 7) last7.unshift(h > 0);
  }
  return {
    activeDays28: activeDays,
    hours28: Math.round(hours * 10) / 10,
    avgHoursActiveDay: activeDays ? Math.round((hours / activeDays) * 10) / 10 : 0,
    last7,
  };
}

/** Planned vs completed vs skipped study sessions across timetables. */
export function computeAdherence(timetables = []) {
  let completed = 0;
  let skipped = 0;
  let total = 0;
  const bySubject = new Map();
  for (const tt of timetables) {
    for (const week of tt.weeks || []) {
      for (const slots of Object.values(week.days || {})) {
        for (const s of slots || []) {
          total += 1;
          if (s.completed) completed += 1;
          else if (s.skipped) skipped += 1;
          const key = s.subject || "Unplanned";
          if (!bySubject.has(key)) bySubject.set(key, { subject: key, completed: 0, total: 0 });
          const row = bySubject.get(key);
          row.total += 1;
          if (s.completed) row.completed += 1;
        }
      }
    }
  }
  return {
    completed,
    skipped,
    total,
    upcoming: Math.max(0, total - completed - skipped),
    percent: total ? Math.round((completed / total) * 100) : null,
    bySubject: [...bySubject.values()]
      .map((r) => ({ ...r, percent: r.total ? Math.round((r.completed / r.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  };
}

/** Actionable "what next": weakest subject + suggested lesson + weak topics. */
export function computeFocusNext(breakdown = [], lessons = []) {
  const withWork = breakdown.filter((s) => s.total > 0 && s.completed < s.total);
  if (!withWork.length) return { weakest: null, nextLesson: null };
  const weakest = [...withWork].sort((a, b) => a.percent - b.percent || (a.avgMastery ?? 50) - (b.avgMastery ?? 50))[0];
  const candidates = lessons
    .filter((l) => l.subjectId === weakest.id && !l.completed)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { weakest, nextLesson: candidates[0] || null };
}

/** One-shot fetch of question mastery snapshot (drives strengths/weaknesses). */
export async function fetchQuestionSnapshot(uid, max = 200) {
  if (!isFirebaseConfigured || !db) {
    return getLocalUser(uid)?.questions || [];
  }
  try {
    const snap = await getDocs(query(collection(db, "users", uid, "questions"), limit(max)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

/** Recent Daily Challenge history (graceful empty when unavailable). */
export async function fetchChallengeHistory(uid, max = 12) {
  if (!isFirebaseConfigured || !db) {
    const local = getLocalUser(uid);
    return local?.dailyChallengeHistory || [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, "users", uid, "dailyChallengeHistory"), orderBy("completedAt", "desc"), limit(max)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}
