import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, isFirebaseConfigured } from "../config/firebase.js";
import { deleteForgeSubject, fetchForgeSubjects } from "./forgeService.js";
import { calculateTotalScore } from "./userService.js";
import { emitScoreChanged } from "./forgeEvents.js";
import { applyCompetitionRanking, mapUserData } from "./leaderboardService.js";

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
