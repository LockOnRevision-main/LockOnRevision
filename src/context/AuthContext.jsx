import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../config/firebase.js";
import { resolveRole } from "../utils/permissions.js";

const AuthContext = createContext(null);

function createUserProfile(user, name) {
  const role = resolveRole(null, user.email);
  return {
    name: name || user.displayName || user.email?.split('@')[0] || "Learner",
    email: user.email,
    username: user.email?.split('@')[0] || "learner",
    bio: "",
    avatarUrl: "",
    role,
    xp: 0,
    energy: 0,
    totalScore: 0,
    streak: 0,
    totalStudyHours: 0,
    completedTests: [],
    completedUnits: [],
    lastTestAttempt: null,
    goals: "",
    favoriteSubjects: [],
    theme: "system",
    activity: {},
    onboardingCompleted: false,
    referralSource: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function ensureUserDocument(user, name) {
  if (!db) return;

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, createUserProfile(user, name));
    return;
  }

  const data = snapshot.data();
  const patch = {};
  
  // Core Identity
  if (!data.name) patch.name = name || user.displayName || user.email?.split('@')[0] || "Learner";
  if (!data.email) patch.email = user.email;
  if (!data.username) patch.username = user.email?.split('@')[0] || "learner";
  if (data.role === undefined) patch.role = resolveRole(data, user.email);

  // Gamification Defaults
  if (typeof data.xp !== "number") patch.xp = 0;
  if (typeof data.energy !== "number") patch.energy = 0;
  if (typeof data.streak !== "number") patch.streak = 0;
  if (typeof data.totalStudyHours !== "number") patch.totalStudyHours = 0;
  if (typeof data.totalScore !== "number") patch.totalScore = (data.xp || 0) + (data.energy || 0) * 100;

  // Data Structures
  if (!Array.isArray(data.completedTests)) patch.completedTests = [];
  if (!Array.isArray(data.completedUnits)) patch.completedUnits = [];
  if (!Array.isArray(data.favoriteSubjects)) patch.favoriteSubjects = [];
  if (typeof data.activity !== "object" || data.activity === null) patch.activity = {};
  if (!("lastTestAttempt" in data)) patch.lastTestAttempt = null;

  // Profile Settings
  if (data.bio === undefined) patch.bio = "";
  if (data.goals === undefined) patch.goals = "";
  if (data.theme === undefined) patch.theme = "system";
  if (data.avatarUrl === undefined) patch.avatarUrl = "";

  // Onboarding
  if (data.onboardingCompleted === undefined) patch.onboardingCompleted = false;
  if (data.referralSource === undefined) patch.referralSource = "";

  if (Object.keys(patch).length) {
    patch.updatedAt = serverTimestamp();
    await setDoc(userRef, patch, { merge: true });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await ensureUserDocument(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) return undefined;
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    });
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isFirebaseConfigured,
      async login(email, password) {
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      async register(name, email, password) {
        if (!auth) throw new Error("Firebase is not configured.");
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await ensureUserDocument(result.user, name);
      },
      logout: () => (auth ? signOut(auth) : undefined),
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
