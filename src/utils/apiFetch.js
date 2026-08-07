import { auth } from "../config/firebase.js";

const VERCEL_API_BASE = import.meta.env.VITE_API_BASE_URL || "https://lockonrevision.vercel.app/api";

function resolveUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) {
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
