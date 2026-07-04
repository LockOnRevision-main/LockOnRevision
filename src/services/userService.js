import { db } from "../config/firebase.js";
import { doc, updateDoc, increment, serverTimestamp, arrayUnion, getDocs, query, orderBy, collection, limit } from "firebase/firestore";

export async function fetchLeaderboard(limit = 50) {
  if (!db) throw new Error("Firebase is not configured.");
  const usersSnap = await getDocs(
    query(collection(db, "users"), orderBy("totalScore", "desc"), limit(limit))
  );
  return usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function calculateTotalScore(profile) {
  const xp = Number(profile?.xp || 0);
  const energy = Number(profile?.energy || 0);
  return xp + energy * 100;
}

export const TESTS = [
  { id: 'test-1', title: 'Foundations of Knowledge', difficulty: 'Easy', energy: 10, xp: 100 },
  { id: 'test-2', title: 'Intermediate Concepts', difficulty: 'Medium', energy: 20, xp: 250 },
  { id: 'test-3', title: 'Advanced Mastery', difficulty: 'Hard', energy: 40, xp: 500 },
];

export async function completeMockTest(uid, testId, score) {
  if (!db) throw new Error("Firebase is not configured.");
  const test = TESTS.find(t => t.id === testId);
  if (!test) throw new Error("Test not found.");

  const earnedEnergy = score >= 60 ? test.energy : 0;
  const earnedXp = score >= 60 ? test.xp : Math.round(test.xp * (score / 100));
  
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    xp: increment(earnedXp),
    energy: increment(earnedEnergy),
    completedTests: arrayUnion(testId),
    updatedAt: serverTimestamp(),
  });
  
  return { earnedEnergy, earnedXp };
}

export async function completeUnit(uid, unitId) {
  if (!db) throw new Error("Firebase is not configured.");
  const earnedEnergy = 15;
  const earnedXp = 150;
  
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    xp: increment(earnedXp),
    energy: increment(earnedEnergy),
    completedUnits: arrayUnion(unitId),
    updatedAt: serverTimestamp(),
  });
  
  return { earnedEnergy, earnedXp };
}

export async function updateUserProfile(uid, updates) {
  if (!db) throw new Error("Firebase is not configured.");
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function trackStudyTime(uid, minutes) {
  if (!db) throw new Error("Firebase is not configured.");
  const userRef = doc(db, "users", uid);
  const today = new Date().toISOString().split('T')[0];
  
  return updateDoc(userRef, {
    totalStudyHours: increment(minutes / 60),
    [`activity.${today}`]: increment(minutes / 60),
    updatedAt: serverTimestamp(),
  });
}

export async function updateGoal(uid, goalId, goalData) {
  if (!db) throw new Error("Firebase is not configured.");
  const userRef = doc(db, "users", uid);
  
  return updateDoc(userRef, {
    [`goals.${goalId}`]: goalData,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleFavoriteSubject(uid, _subjectId) {
  if (!db) throw new Error("Firebase is not configured.");
  const _userRef = doc(db, "users", uid);
}

export function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getRank(level) {
  if (level < 5) return "Novice";
  if (level < 15) return "Apprentice";
  if (level < 30) return "Scholar";
  if (level < 50) return "Expert";
  return "Master";
}

export function getBadge(xp, lessonsCompleted, streak) {
  const badges = [];
  if (xp >= 1000) badges.push({ id: 'xp-1k', label: '1k XP Club', icon: '🏆' });
  if (lessonsCompleted >= 50) badges.push({ id: 'lesson-50', label: 'Consistent Learner', icon: '📚' });
  if (streak >= 7) badges.push({ id: 'streak-7', label: 'Week Warrior', icon: '🔥' });
  if (streak >= 30) badges.push({ id: 'streak-30', label: 'Month Master', icon: '🌟' });
  return badges;
}
