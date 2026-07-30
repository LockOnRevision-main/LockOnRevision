import { isFirebaseConfigured } from "../config/firebase.js";
import { getForgeContext } from "./forgeService.js";
import { apiFetch } from "../utils/apiFetch.js";

export async function askForgeAssistant(uid, messages) {
  if (!isFirebaseConfigured) {
    const { subjects } = await getForgeContext(uid);
    const fallback = {
      reply: subjects.length
        ? "I can help you revise your Forge subjects. Ask about a specific unit, sub-unit, or lesson."
        : "Upload notes in Forge first so I can answer with your study material context.",
    };
    return fallback;
  }

  try {
    const { subjects } = await getForgeContext(uid);
    const response = await apiFetch('/api/ask-forge-assistant', {
      method: 'POST',
      body: JSON.stringify({ messages, subjects }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Vercel API error:", error);
    const { subjects } = await getForgeContext(uid);
    const fallback = {
      reply: subjects.length
        ? "I can help you revise your Forge subjects. Ask about a specific unit, sub-unit, or lesson."
        : "Upload notes in Forge first so I can answer with your study material context.",
    };
    return fallback;
  }
}
