import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../config/firebase.js";
import { canAccessAdmin } from "../utils/permissions.js";
import { signOutLocalUser } from "../services/localStore.js";
import i18n from "../i18n/index.js";

const AuthContext = createContext(null);

const PLACEHOLDER_NAME = "Lock-on Learner";

function createUserProfile(user, name) {
  return {
    name: name || user.displayName || user.email?.split('@')[0] || PLACEHOLDER_NAME,
    email: user.email,
    username: user.email?.split('@')[0] || "learner",
    bio: "",
    avatarUrl: "",
    avatarIcon: "",
    hasCustomAvatar: false,
    isAdmin: false,
    xp: 0,
    energy: 0,
    totalScore: 0,
    streak: 0,
    totalStudyHours: 0,
    completedLessons: 0,
    completedTests: [],
    completedUnits: [],
    lastTestAttempt: null,
    goals: "",
    grade: "",
    curriculum: "",
    favoriteSubjects: [],
    theme: "system",
    preferredLanguage: "en",
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
  if (!data.name) patch.name = name || user.displayName || user.email?.split('@')[0] || PLACEHOLDER_NAME;
  if (!data.email) patch.email = user.email;
  if (!data.username) patch.username = user.email?.split('@')[0] || "learner";

  // Migrate role -> isAdmin
  if (data.role === "admin" && data.isAdmin !== true) {
    patch.isAdmin = true;
  }
  if (data.isAdmin === undefined && data.role !== "admin") {
    patch.isAdmin = canAccessAdmin(data);
  }

  // If the display name is the placeholder, treat as incomplete onboarding
  if (data.name === PLACEHOLDER_NAME) {
    patch.onboardingCompleted = false;
  }

  // Gamification Defaults
  if (typeof data.xp !== "number") patch.xp = 0;
  if (typeof data.energy !== "number") patch.energy = 0;
  if (typeof data.streak !== "number") patch.streak = 0;
  if (typeof data.totalStudyHours !== "number") patch.totalStudyHours = 0;
  if (typeof data.completedLessons !== "number") patch.completedLessons = 0;
  const expectedTotal = (data.xp || 0) + (data.energy || 0) * 100;
  if (typeof data.totalScore !== "number" || data.totalScore !== expectedTotal) patch.totalScore = expectedTotal;

  // Data Structures
  if (!Array.isArray(data.completedTests)) patch.completedTests = [];
  if (!Array.isArray(data.completedUnits)) patch.completedUnits = [];
  if (!Array.isArray(data.favoriteSubjects)) patch.favoriteSubjects = [];
  if (typeof data.activity !== "object" || data.activity === null) patch.activity = {};
  if (!("lastTestAttempt" in data)) patch.lastTestAttempt = null;

  // Profile Settings
  if (data.bio === undefined) patch.bio = "";
  if (data.goals === undefined) patch.goals = "";
  if (data.grade === undefined) patch.grade = "";
  if (data.curriculum === undefined) patch.curriculum = "";
  if (data.theme === undefined) patch.theme = "system";
  if (data.preferredLanguage === undefined) patch.preferredLanguage = "en";
  if (data.avatarUrl === undefined) patch.avatarUrl = "";
  if (data.avatarIcon === undefined) patch.avatarIcon = "";
  if (data.hasCustomAvatar === undefined) patch.hasCustomAvatar = false;

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

  // Apply theme whenever profile changes
  useEffect(() => {
    if (!profile?.theme) return;
    const root = document.documentElement;
    if (profile.theme === "dark") {
      root.classList.add("dark");
    } else if (profile.theme === "light") {
      root.classList.remove("dark");
    } else {
      // system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [profile?.theme]);

  // Apply preferredLanguage whenever profile changes (login, snapshot update)
  useEffect(() => {
    if (profile?.preferredLanguage) {
      i18n.changeLanguage(profile.preferredLanguage);
    }
  }, [profile?.preferredLanguage]);

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
      async resetPassword(email) {
        if (!auth) throw new Error("Firebase is not configured.");
        await sendPasswordResetEmail(auth, email);
      },
      async changePassword(newPassword) {
        if (!auth || !auth.currentUser) throw new Error("Not authenticated.");
        await updatePassword(auth.currentUser, newPassword);
      },
      logout: () => {
        signOutLocalUser();
        return auth ? signOut(auth) : undefined;
      },
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
