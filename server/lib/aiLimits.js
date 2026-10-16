/**
 * P51 Stage 1.3 — shared AI-route guards.
 *
 * Every Gemini-backed route enforces, BEFORE any model call:
 *  1. maximum request-body size (413, deterministic per route);
 *  2. maximum user-text length per primary text field (413, per route);
 *  3. authenticated-user rate limit via the existing in-memory layers
 *     in lib/validation.js (429, per-instance best-effort — serverless
 *     instances do not share memory; see rateLimit docs).
 * Error responses are safe by construction: generic wording, a stable
 * `code`, never key names, prompts, or stack traces.
 */
import { rateLimit, rateLimitKey } from "./validation.js";

/**
 * Per-route caps. `maxBodyChars` bounds JSON.stringify(req.body).length;
 * `maxTextChars` bounds the primary user-supplied text field the handler
 * passes for assertion via assertAiTextLength().
 */
export const AI_LIMITS = {
  "ai-tutor-chat": { maxBodyChars: 64000, maxTextChars: 20000, max: 30, windowMs: 60_000 },
  "ask-forge-assistant": { maxBodyChars: 64000, maxTextChars: 20000, max: 30, windowMs: 60_000 },
  "generate-forge-structure": { maxBodyChars: 120000, maxTextChars: 80000, max: 10, windowMs: 60_000 },
  "generate-learning-content": { maxBodyChars: 120000, maxTextChars: 80000, max: 10, windowMs: 60_000 },
  "process-uploaded-notes": { maxBodyChars: 120000, maxTextChars: 80000, max: 10, windowMs: 60_000 },
  "extract-timetable-docs": { maxBodyChars: 120000, maxTextChars: 80000, max: 10, windowMs: 60_000 },
  "generate-timetable": { maxBodyChars: 60000, maxTextChars: 40000, max: 10, windowMs: 60_000 },
  "generate-question-hint": { maxBodyChars: 20000, maxTextChars: 12000, max: 20, windowMs: 60_000 },
  "explain-wrong-answer": { maxBodyChars: 20000, maxTextChars: 12000, max: 20, windowMs: 60_000 },
  "generate-daily-challenge": { maxBodyChars: 60000, maxTextChars: 40000, max: 10, windowMs: 60_000 },
  "delete-cloudinary-files": { maxBodyChars: 20000, maxTextChars: 12000, max: 20, windowMs: 60_000 },
};

export function aiBodySize(body) {
  try {
    return JSON.stringify(body ?? {}).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Enforces body-size cap + authenticated-user rate limit.
 * Returns true when the request may proceed; otherwise responds
 * (413 or 429) and returns false. Never throws.
 */
export function checkAiGuard(req, res, route) {
  const lim = AI_LIMITS[route];
  if (!lim) {
    res.status(500).json({ error: "Something went wrong. Please try again.", code: "ai_error" });
    return false;
  }
  if (aiBodySize(req.body) > lim.maxBodyChars) {
    res.status(413).json({ error: "Request is too large. Please shorten your input and try again.", code: "ai_too_large" });
    return false;
  }
  const rl = rateLimit(rateLimitKey(req, route), { max: lim.max, windowMs: lim.windowMs });
  if (!rl.allowed) {
    res.status(429).json({ error: "Too many requests. Please try again later.", code: "ai_rate_limited" });
    return false;
  }
  return true;
}

/** Throws a 413-tagged error when `text` exceeds the route's text cap. */
export function assertAiTextLength(text, route, field = "text") {
  const lim = AI_LIMITS[route];
  const max = lim ? lim.maxTextChars : 20000;
  if (typeof text !== "string" || text.length === 0 || text.length > max) {
    throw Object.assign(new Error(`Invalid ${field}: must be 1-${max} characters`), { status: 413 });
  }
  return text;
}

/** Safe 503 body: generic wording, stable code, no key/prompt/stack detail. */
export function geminiUnavailable() {
  return {
    error: "The AI assistant is temporarily unavailable. Please try again later.",
    code: "ai_unavailable",
  };
}

/** Safe 500 body for AI failures: never echoes provider messages. */
export function aiFailed(fallback = "Something went wrong. Please try again.") {
  return { error: fallback, code: "ai_error" };
}
