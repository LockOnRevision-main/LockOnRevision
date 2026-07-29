import { auth } from "../config/firebase.js";

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
  const response = await fetch(url, { ...options, headers });
  return response;
}
