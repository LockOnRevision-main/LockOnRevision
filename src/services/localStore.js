const STORAGE_KEY = "lockon-revision-local-state";
const EVENT_NAME = "lockon-local-state-changed";

const starterState = {
  currentUserId: null,
  users: {},
};

export function createDefaultProfile(user) {
  return {
    id: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || "Learner",
    email: user.email,
    photoURL: user.photoURL || "",
    energy: 100,
    streak: 0,
    dailyUsage: {
      aiRequests: 0,
      quizzesCompleted: 0,
      uploadsProcessed: 0,
      lastReset: new Date().toISOString(),
    },
    goal: "Revise one lesson with active recall",
    focus: "Weakest topic first",
    plan: "Free",
    badges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function readLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...starterState, ...JSON.parse(raw) } : { ...starterState };
  } catch {
    return { ...starterState };
  }
}

export function writeLocalState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeLocalState(callback) {
  const handler = () => callback(readLocalState());
  window.addEventListener(EVENT_NAME, handler);
  handler();
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function ensureLocalUser({ name, email }) {
  const state = readLocalState();
  const uid = `local-${email.toLowerCase().replace(/[^\w]+/g, "-")}`;
  const user = {
    uid,
    email,
    displayName: name || email.split("@")[0] || "Learner",
    photoURL: "",
    isLocal: true,
  };

  state.users[uid] = state.users[uid] || {
    profile: createDefaultProfile(user),
    subjects: [],
    units: [],
    subUnits: [],
    lessons: [],
    questions: [],
    answers: [],
    files: [],
    forgeSourceText: {},
  };
  state.users[uid].profile = {
    ...state.users[uid].profile,
    displayName: user.displayName,
    email: user.email,
    updatedAt: new Date().toISOString(),
  };
  state.currentUserId = uid;
  writeLocalState(state);
  return user;
}

export function getLocalUser(uid) {
  return readLocalState().users[uid];
}

export function updateLocalUser(uid, updater) {
  const state = readLocalState();
  const current = state.users[uid];
  if (!current) return null;
  state.users[uid] = updater(current);
  state.users[uid].profile.updatedAt = new Date().toISOString();
  writeLocalState(state);
  return state.users[uid];
}

export function signOutLocalUser() {
  const state = readLocalState();
  state.currentUserId = null;
  writeLocalState(state);
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
