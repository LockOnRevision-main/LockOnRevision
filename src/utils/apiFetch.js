import { auth } from "../config/firebase.js";

const LOCAL_API_BASES = ["http://127.0.0.1:3000", "http://localhost:3000"];
const VERCEL_API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function resolveUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) {
    if (import.meta.env.DEV) {
      return `${LOCAL_API_BASES[0]}${url}`;
    }
    return `${VERCEL_API_BASE}${url.replace("/api", "")}`;
  }
  return url;
}

export async function apiFetch(url, options = {}) {
  const headers = { ...options.headers };
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch {}
  }
  const response = await fetch(resolveUrl(url), { ...options, headers });
  return response;
}
