import { calculateLevel, getRank } from "./userService.js";
import { fetchForgeSubjects, getForgeContext } from "./forgeService.js";
import {
  getDocs,
  query,
  orderBy,
  collection,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { getLocalUser } from "./localStore.js";

export async function getAiContext(uid, profile) {
  const forgeTree = await fetchForgeSubjects(uid);
  const allLessons = await fetchAllLessons(uid);
  const allUnits = await fetchAllUnits(uid);

  const { strongSubjects, weakSubjects } = analyzeSubjectPerformance(forgeTree, allLessons);

  const { completedLessonCount, totalLessonCount, completionPercent } =
    countLessons(forgeTree, allLessons);

  const level = calculateLevel(profile?.xp || 0);
  const rank = getRank(level);

  const energy = Number(profile?.energy || 0);

  // Fetch forge source text for AI context
  let sourceText = "";
  try {
    const forgeCtx = await getForgeContext(uid);
    sourceText = forgeCtx.sourceText || "";
  } catch { /* silently fail */ }

  // Fetch timetable data
  let timetableData = null;
  try {
    const timetables = await fetchTimetables(uid);
    timetableData = timetables[0] || null;
  } catch { /* silently fail */ }

  return {
    profile: {
      name: profile?.name || "Learner",
      level,
      rank,
      xp: Number(profile?.xp || 0),
      energy,
      totalScore: profile?.totalScore != null ? Number(profile.totalScore) : (Number(profile?.xp || 0) + energy * 100),
      streak: Number(profile?.streak || 0),
      totalStudyHours: Number(profile?.totalStudyHours || 0),
      completedLessons: Number(profile?.completedLessons || 0),
      completedUnits: profile?.completedUnits?.length || 0,
      completedTests: profile?.completedTests?.length || 0,
      goals: profile?.goals || "",
    },
    curriculum: {
      subjects: forgeTree.map((subject) => ({
        title: subject.title,
        description: subject.description,
        units: subject.units?.length || 0,
        progress: getSubjectProgress(subject, allLessons),
      })),
      strongSubjects,
      weakSubjects,
      overallProgress: {
        completedLessons: completedLessonCount,
        totalLessons: totalLessonCount,
        percent: completionPercent,
      },
      totalUnits: allUnits.length,
    },
    studyStats: {
      totalStudyHours: Number(profile?.totalStudyHours || 0),
      averagePerDay: estimateDailyAverage(profile?.activity),
    },
    forgeContext: {
      subjects: forgeTree,
      lessonCount: allLessons.length,
      sourceText: sourceText.slice(0, 80000),
    },
    timetable: timetableData
      ? {
          weeks: timetableData.weeks?.length || 0,
          preferences: timetableData.preferences || {},
          todaySessions: getTodaysSessions(timetableData),
          weeklyCompletion: getWeeklyCompletion(timetableData),
        }
      : null,
  };
}

function getTodaysSessions(timetable) {
  if (!timetable?.weeks) return [];
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const week of timetable.weeks) {
    const weekStart = week.startDate;
    const weekEnd = new Date(weekStart + "T00:00:00");
    weekEnd.setDate(weekEnd.getDate() + 7);
    const today = new Date(todayStr + "T00:00:00");
    if (today >= new Date(weekStart + "T00:00:00") && today < weekEnd) {
      const dayName = DAYS[(today.getDay() + 6) % 7];
      return (week.days?.[dayName] || []).filter((s) => !s.completed && !s.skipped);
    }
  }
  return [];
}

function getWeeklyCompletion(timetable) {
  if (!timetable?.weeks) return { completed: 0, total: 0, percent: 0 };
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const now = new Date();
  let completed = 0;
  let total = 0;
  for (const week of timetable.weeks) {
    const weekStart = new Date(week.startDate + "T00:00:00");
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (now >= weekEnd) continue;
    for (const day of DAYS) {
      const slots = week.days?.[day] || [];
      for (const slot of slots) {
        total++;
        if (slot.completed) completed++;
      }
    }
    break;
  }
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

async function fetchTimetables(uid) {
  if (!isFirebaseConfigured) {
    return getLocalUser(uid)?.timetables || [];
  }
  const snap = await getDocs(query(collection(db, "users", uid, "timetables"), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchAllLessons(uid) {
  if (!isFirebaseConfigured) {
    return getLocalUser(uid)?.lessons || [];
  }
  const snap = await getDocs(query(collection(db, "users", uid, "lessons"), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchAllUnits(uid) {
  if (!isFirebaseConfigured) {
    return getLocalUser(uid)?.units || [];
  }
  const snap = await getDocs(collection(db, "users", uid, "units"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function getSubjectProgress(subject, allLessons) {
  const subjectLessons = allLessons.filter((l) => l.subjectId === subject.id);
  const done = subjectLessons.filter((l) => l.completed).length;
  const total = subjectLessons.length;
  return total ? { completed: done, total, percent: Math.round((done / total) * 100) } : null;
}

function countLessons(subjects, allLessons) {
  const totalLessonCount = allLessons.length;
  const completedLessonCount = allLessons.filter((l) => l.completed).length;
  const completionPercent = totalLessonCount
    ? Math.round((completedLessonCount / totalLessonCount) * 100)
    : 0;
  return { completedLessonCount, totalLessonCount, completionPercent };
}

function analyzeSubjectPerformance(subjects, allLessons) {
  const withProgress = subjects
    .map((s) => {
      const p = getSubjectProgress(s, allLessons);
      return p ? { title: s.title, percent: p.percent } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.percent - a.percent);

  return {
    strongSubjects: withProgress.slice(0, 3).map((s) => s.title),
    weakSubjects: withProgress.slice(-3).reverse().map((s) => `${s.title} (${s.percent}%)`),
  };
}

function estimateDailyAverage(activity) {
  if (!activity || typeof activity !== "object") return 0;
  const days = Object.keys(activity);
  if (!days.length) return 0;
  const total = days.reduce((sum, key) => sum + Number(activity[key] || 0), 0);
  return Math.round((total / days.length) * 100) / 100;
}
