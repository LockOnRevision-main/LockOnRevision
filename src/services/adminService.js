import {
  average,
  collection,
  collectionGroup,
  doc,
  getAggregateFromServer,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  sum,
  Timestamp,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, isFirebaseConfigured } from "../config/firebase.js";
import { deleteForgeSubject, fetchForgeSubjects } from "./forgeService.js";
import { calculateTotalScore } from "./userService.js";
import { emitScoreChanged } from "./forgeEvents.js";
import { applyCompetitionRanking, mapUserData } from "./leaderboardService.js";
import {
  computeAdherence,
  computeConsistency,
  computeSubjectBreakdown,
  toDate,
} from "./analyticsService.js";

const ADMIN_FIELDS = new Set(["isAdmin", "role"]);

function stripAdminFields(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = { ...obj };
  for (const key of ADMIN_FIELDS) delete cleaned[key];
  return cleaned;
}

async function verifyAdminServer() {
  // Prefer server verification via callable (handles CORS automatically).
  // If functions are not deployed (Spark plan) the callable will 404/CORS fail.
  // Fall back to client-side Firestore check so admin page still works.
  if (functions) {
    try {
      const check = httpsCallable(functions, "verifyAdminAccess");
      // Log request for debugging: URL is auto-resolved by SDK to
      // https://us-central1-{projectId}.cloudfunctions.net/verifyAdminAccess
      console.log("[admin] verifyAdminAccess callable invoked", { region: "us-central1" });
      const result = await check();
      console.log("[admin] verifyAdminAccess callable succeeded", result.data);
      if (result?.data?.admin === true) return true;
      // If server explicitly says not admin, don't fall back - respect server.
      return false;
    } catch (err) {
      const code = err?.code || err?.message || "unknown";
      console.warn("[admin] verifyAdminAccess callable failed, falling back to Firestore", { code, message: err?.message });
      // Fall through to Firestore fallback for deploy/ CORS errors
      const isDeployOrCorsError =
        code === "functions/not-found" ||
        code === "functions/unavailable" ||
        code.includes("CORS") ||
        err?.message?.includes("CORS") ||
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("not-found");
      if (!isDeployOrCorsError && code !== "unauthenticated" && code !== "permission-denied") {
        // For unexpected errors, still try fallback but also surface error
        console.warn("[admin] unexpected callable error, attempting fallback", err);
      }
      // permission-denied / unauthenticated from callable are definitive - do not fallback to bypass
      if (code === "permission-denied" || code === "functions/permission-denied") {
        throw new Error("You don't have permission to access this page.");
      }
      if (code === "unauthenticated" || code === "functions/unauthenticated") {
        throw new Error("Please sign in again.");
      }
    }
  }

  // --- Fallback: direct Firestore read (works on Spark plan without Blaze/functions) ---
  // Security is still enforced by Firestore rules (isAdmin() check in rules).
  // This fallback only affects UI gating; actual writes are still rejected by rules if not admin.
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Please sign in again.");
  console.log("[admin] fallback Firestore admin check", { uid });
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    console.warn("[admin] fallback - user doc not found", { uid });
    throw new Error("We couldn't find your profile. Please try again.");
  }
  const data = snap.data();
  const isAdmin = data.isAdmin === true || data.role === "admin";
  console.log("[admin] fallback verification result", { uid, isAdmin, isAdminField: data.isAdmin, role: data.role });
  return isAdmin;
}

async function requireAdmin() {
  const isAdmin = await verifyAdminServer();
  if (!isAdmin) throw new Error("You don't have permission to access this page.");
}

export async function searchUsers(searchTerm = "", max = 50) {
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  await requireAdmin();

  const snapshot = await getDocs(query(collection(db, "users"), limit(max)));
  const users = snapshot.docs.map((item) => stripAdminFields({ id: item.id, ...item.data() }));
  const term = (searchTerm ?? "").trim().toLowerCase();

  if (!term) return users;
  return users.filter(
    (user) =>
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.id?.toLowerCase().includes(term),
  );
}

export async function adjustUserXp(uid, delta) {
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  await requireAdmin();
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error("We couldn't find that user. Please try again.");

    const data = snapshot.data();
    const nextXp = Math.max(0, Number(data.xp || 0) + Number(delta || 0));
    const nextTotal = calculateTotalScore({ xp: nextXp, energy: data.energy || 0 });

    transaction.update(userRef, {
      xp: nextXp,
      totalScore: nextTotal,
      updatedAt: serverTimestamp(),
    });

    emitScoreChanged({ uid, reason: "admin-xp-adjust", totalChange: nextTotal - calculateTotalScore({ xp: data.xp || 0, energy: data.energy || 0 }) });
    return { xp: nextXp, energy: data.energy || 0, totalScore: nextTotal };
  });
}

export async function adjustUserEnergy(uid, delta) {
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  await requireAdmin();
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error("We couldn't find that user. Please try again.");

    const data = snapshot.data();
    const nextEnergy = Math.max(0, Number(data.energy || 0) + Number(delta || 0));
    const nextTotal = calculateTotalScore({ xp: data.xp || 0, energy: nextEnergy });

    transaction.update(userRef, {
      energy: nextEnergy,
      totalScore: nextTotal,
      updatedAt: serverTimestamp(),
    });

    emitScoreChanged({ uid, reason: "admin-energy-adjust", totalChange: nextTotal - calculateTotalScore({ xp: data.xp || 0, energy: data.energy || 0 }) });
    return { xp: data.xp || 0, energy: nextEnergy, totalScore: nextTotal };
  });
}

export async function setUserTotalScore(uid, totalScore) {
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  await requireAdmin();
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error("We couldn't find that user. Please try again.");

    transaction.update(userRef, {
      totalScore: Math.max(0, Number(totalScore || 0)),
      updatedAt: serverTimestamp(),
    });

    emitScoreChanged({ uid, reason: "admin-set-score", totalChange: 0 });
    return { totalScore: Math.max(0, Number(totalScore || 0)) };
  });
}

export async function grantLeaderboardReward(uid, { xp = 0, energy = 0, reason = "Admin reward" }) {
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  await requireAdmin();
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error("We couldn't find that user. Please try again.");

    const data = snapshot.data();
    const nextXp = Math.max(0, Number(data.xp || 0) + Number(xp || 0));
    const nextEnergy = Math.max(0, Number(data.energy || 0) + Number(energy || 0));
    const nextTotal = calculateTotalScore({ xp: nextXp, energy: nextEnergy });
    const rewards = Array.isArray(data.adminRewards) ? data.adminRewards : [];

    transaction.update(userRef, {
      xp: nextXp,
      energy: nextEnergy,
      totalScore: nextTotal,
      adminRewards: [
        { xp: Number(xp || 0), energy: Number(energy || 0), reason, grantedAt: new Date().toISOString() },
        ...rewards,
      ].slice(0, 20),
      updatedAt: serverTimestamp(),
    });

    emitScoreChanged({ uid, reason: "admin-reward", totalChange: nextTotal - calculateTotalScore({ xp: data.xp || 0, energy: data.energy || 0 }) });
    return { xp: nextXp, energy: nextEnergy, totalScore: nextTotal };
  });
}

export async function fetchAllForgeSubjects() {
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  await requireAdmin();

  const usersSnap = await getDocs(query(collection(db, "users"), limit(100)));
  const results = [];

  for (const userDoc of usersSnap.docs) {
    const subjects = await fetchForgeSubjects(userDoc.id);
    subjects.forEach((subject) => {
      results.push({
        userId: userDoc.id,
        userName: userDoc.data().name || "Unknown",
        userEmail: userDoc.data().email || "",
        subject,
      });
    });
  }

  return results;
}

export async function moderateForgeSubject(userId, subjectId) {
  await requireAdmin();
  await deleteForgeSubject(userId, subjectId);
  return { ok: true };
}

export async function getAdminOverview() {
  await requireAdmin();
  if (!isFirebaseConfigured) {
    return {
      available: false,
      message: "We couldn't load your data. Please try again.",
    };
  }

  const usersSnap = await getDocs(query(collection(db, "users"), orderBy("totalScore", "desc"), limit(10)));
  const rawUsers = usersSnap.docs.map(mapUserData);
  const ranked = applyCompetitionRanking(rawUsers);
  return {
    available: true,
    topUsers: ranked.map((item) => stripAdminFields({
      id: item.id,
      rank: item._rank,
      ...item,
    })),
  };
}

/** Resolve with null on any failure so one missing index never breaks the panel. */
function safe(promise) {
  return promise.then((v) => v).catch(() => null);
}

function mondayStarts(weeks = 8) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    return d;
  }).reverse();
}

/**
 * Platform-level analytics for verified admins only.
 * Uses server-side count/sum/average aggregations — no user documents
 * are transferred. Every metric degrades to null (shown as "—")
 * instead of failing when data or an index is unavailable.
 */
export async function getPlatformAnalytics() {
  await requireAdmin();
  if (!db) throw new Error("We couldn't load your data. Please try again.");

  const usersCol = collection(db, "users");
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 864e5);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekStarts = mondayStarts(8);

  const [
    totalUsers,
    activeToday,
    active7d,
    challengeToday,
    totals,
    cumulative,
    subjectsCreated,
    lessonsCreated,
    timetablesCreated,
  ] = await Promise.all([
    safe(getCountFromServer(usersCol).then((s) => s.data().count)),
    safe(getCountFromServer(query(usersCol, where("updatedAt", ">=", Timestamp.fromDate(startOfToday)))).then((s) => s.data().count)),
    safe(getCountFromServer(query(usersCol, where("updatedAt", ">=", Timestamp.fromDate(sevenDaysAgo)))).then((s) => s.data().count)),
    safe(getCountFromServer(query(usersCol, where("lastCompletedDate", "==", todayStr))).then((s) => s.data().count)),
    safe(
      getAggregateFromServer(usersCol, {
        xpTotal: sum("xp"),
        lessonsTotal: sum("completedLessons"),
        hoursTotal: sum("totalStudyHours"),
        avgEnergy: average("energy"),
      }).then((s) => s.data()),
    ),
    Promise.all(
      weekStarts.map((d) =>
        safe(
          getCountFromServer(query(usersCol, where("createdAt", ">=", Timestamp.fromDate(d)))).then((s) => s.data().count),
        ),
      ),
    ),
    // Collection-group counts need a collection-group index (see firestore.indexes.json).
    safe(getCountFromServer(collectionGroup(db, "subjects")).then((s) => s.data().count)),
    safe(getCountFromServer(collectionGroup(db, "lessons")).then((s) => s.data().count)),
    safe(getCountFromServer(collectionGroup(db, "timetables")).then((s) => s.data().count)),
  ]);

  // Derive per-week signups from cumulative counts (oldest → newest).
  let newUsersTrend = null;
  if (cumulative && cumulative.every((c) => typeof c === "number")) {
    newUsersTrend = weekStarts.map((d, i) => ({
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      count: Math.max(0, cumulative[i] - (cumulative[i + 1] ?? 0)),
    }));
  }

  return {
    totalUsers,
    activeToday,
    active7d,
    challengeToday,
    xpTotal: totals?.xpTotal ?? null,
    lessonsTotal: totals?.lessonsTotal ?? null,
    hoursTotal: totals?.hoursTotal != null ? Math.round(totals.hoursTotal * 10) / 10 : null,
    avgEnergy: totals?.avgEnergy != null ? Math.round(totals.avgEnergy * 10) / 10 : null,
    newUsersTrend,
    usage: {
      subjects: subjectsCreated,
      lessons: lessonsCreated,
      timetables: timetablesCreated,
    },
  };
}

/**
 * Individual-user learning insights for verified admins only.
 * Returns the same rollups as the student Analytics page plus identity
 * already visible in the admin user list (name/email) — nothing more.
 */
export async function getUserAnalytics(targetUid) {
  await requireAdmin();
  if (!db) throw new Error("We couldn't load your data. Please try again.");
  if (!targetUid) throw new Error("Select a user first.");

  const [userSnap, subjectsSnap, lessonsSnap, questionsSnap, ttSnap] = await Promise.all([
    getDoc(doc(db, "users", targetUid)),
    getDocs(query(collection(db, "users", targetUid, "subjects"), limit(100))),
    getDocs(query(collection(db, "users", targetUid, "lessons"), limit(200))),
    getDocs(query(collection(db, "users", targetUid, "questions"), limit(200))),
    getDocs(collection(db, "users", targetUid, "timetables")),
  ]);

  if (!userSnap.exists()) throw new Error("We couldn't find that user. Please try again.");
  const userData = userSnap.data();
  const subjects = subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lessons = lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const questions = questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const timetables = ttSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const breakdown = computeSubjectBreakdown(subjects, lessons, questions);
  const done = lessons.filter((l) => l.completed);
  const recentLessons = [...lessons]
    .sort((a, b) => {
      const da = toDate(a.completedAt || a.updatedAt);
      const db2 = toDate(b.completedAt || b.updatedAt);
      return (db2?.getTime() || 0) - (da?.getTime() || 0);
    })
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      title: l.title || "Untitled lesson",
      subjectName: l.subjectName || "",
      completed: !!l.completed,
      xpEarned: Number(l.xpEarned || 0),
      at: (() => { const d = toDate(l.completedAt || l.updatedAt); return d ? d.toISOString() : null; })(),
    }));

  return {
    profile: stripAdminFields({
      id: targetUid,
      name: userData.name || "",
      email: userData.email || "",
      xp: Number(userData.xp || 0),
      energy: Number(userData.energy || 0),
      totalScore: Number(userData.totalScore || 0),
      streak: Number(userData.currentStreak ?? userData.streak ?? 0),
      completedLessons: Number(userData.completedLessons || 0),
    }),
    progress: {
      total: lessons.length,
      completed: done.length,
      percent: lessons.length ? Math.round((done.length / lessons.length) * 100) : 0,
      perfect: done.filter((l) => l.perfect).length,
    },
    consistency: computeConsistency(userData.activity && typeof userData.activity === "object" ? userData.activity : {}),
    adherence: computeAdherence(timetables),
    breakdown,
    recentLessons,
  };
}

