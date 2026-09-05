/**
 * Network resilience helpers – classifies Firebase / fetch errors
 * and returns user-facing messages + mitigation hints.
 */

export function isNetworkError(error) {
  if (!error) return false;
  const code = error?.code || "";
  const msg = (error?.message || "").toLowerCase();
  return (
    code === "unavailable" ||
    code === "auth/network-request-failed" ||
    code === "auth/timeout" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    error?.name === "TypeError" && msg.includes("fetch")
  );
}

export function isBlockedError(error) {
  // Heuristic: same as network, but caller can add context hint
  return isNetworkError(error);
}

export function getUserFriendlyMessage(error, context = "request") {
  const code = error?.code || "";
  if (code === "permission-denied") {
    return "Access denied. Please sign in again or check your permissions.";
  }
  if (code === "unauthenticated" || code === "auth/user-token-expired" || code === "auth/invalid-user-token") {
    return "Session expired. Please sign in again.";
  }
  if (isNetworkError(error)) {
    return `Network error while ${context}. Your firewall, ad-blocker, or DNS filter may be blocking Firebase. Check that firestore.googleapis.com and identitytoolkit.googleapis.com are allowed, then retry.`;
  }
  if (error?.message) {
    return error.message.replace(/^Firebase:\s*/i, "");
  }
  return `Could not complete ${context}. Please retry.`;
}

/**
 * Table-friendly endpoint inventory – used for audit documentation
 * Keep in sync with actual outbound hosts in this codebase.
 */
export const ENDPOINT_INVENTORY = [
  {
    endpoint: "firestore.googleapis.com / fstore.googleapis.com (www.googleapis.com – Firestore REST + gRPC-Web)",
    purpose: "Firestore document reads/writes + realtime listeners (users/*)",
    critical: true,
    effectIfBlocked: "Subjects, lessons, profile, leaderboard all fail; app shows infinite spinner or empty state.",
    mitigation: "Add onSnapshot / getDocs error callbacks → surface retry banner; never swallow errors.",
  },
  {
    endpoint: "identitytoolkit.googleapis.com + securetoken.googleapis.com",
    purpose: "Firebase Auth – sign-in, token refresh, password reset",
    critical: true,
    effectIfBlocked: "Login, Google sign-in, and silent token refresh fail; user appears logged out.",
    mitigation: "Call getIdToken() inside try; surface 'network' message; offer retry / disable strict DNS blocking.",
  },
  {
    endpoint: "https://<project>.firebaseapp.com/__/auth/* (authDomain handler)",
    purpose: "OAuth popup/redirect handler for Google Sign-In",
    critical: true,
    effectIfBlocked: "Google popup never completes, credential flow stalls.",
    mitigation: "Whitelist authDomain; handle popup-closed/blocked errors explicitly.",
  },
  {
    endpoint: "accounts.google.com + www.googleapis.com OAuth",
    purpose: "Google identity provider (OIDC)",
    critical: true,
    effectIfBlocked: "Google Sign-In button does nothing / popup blocked.",
    mitigation: "Explain popup-blocker / allow accounts.google.com.",
  },
  {
    endpoint: "Vercel /api/* (apiFetch) – generate-forge-structure, ask-forge-assistant, etc.",
    purpose: "AI generation + server-side Gemini calls (proxied via Vercel functions)",
    critical: true,
    effectIfBlocked: "Forge generation fails; AI chat fails. On restrictive proxies /api/* may be blocked.",
    mitigation: "Show explicit generation error + retry; do not leave busy spinner hanging.",
  },
  {
    endpoint: "api.cloudinary.com + res.cloudinary.com",
    purpose: "File uploads for Forge notes (PDF, images) + avatar hosting",
    critical: false,
    effectIfBlocked: "Binary file upload fails; text-paste path still works. Avatar display may miss images.",
    mitigation: "Fall back to text placeholder when Cloudinary blocked; show 'upload failed – try paste' message.",
  },
  {
    endpoint: "@firebase/analytics transitive + googletagmanager / google-analytics (not initialized)",
    purpose: "Optional telemetry – NOT currently used (getAnalytics never called)",
    critical: false,
    effectIfBlocked: "No user-visible effect. Must never affect critical flows.",
    mitigation: "Never await analytics; isolate in try/catch; do not gate app boot on it.",
  },
];
