import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * Prompt 49: focused security-review regressions (fast, no emulator).
 * - P1: no bearer-token material in server logs.
 * - P1: ai-tutor-chat abuse caps (deterministic) + per-instance friction.
 * - P1 hygiene: no API-key literal in the tracked dev script.
 */
describe("Prompt 49: no credential material in logs", () => {
  it("auth.js logs presence-only, never token content", () => {
    const src = read("server/lib/auth.js");
    assert.ok(!src.includes("authHeaderPreview"), "no header preview field");
    // No slice/substring of the raw Authorization header anywhere.
    assert.ok(!/authHeader(\?\.)?\s*\.\s*slice/.test(src), "no slicing of the auth header");
    assert.ok(src.includes("hasAuthHeader"), "presence boolean retained for diagnostics");
  });

  it("dev bypass stays fail-closed in production", async () => {
    const OLD = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      delete process.env.LOR_ENABLE_DEV_BYPASS;
      const auth = await import("../server/lib/auth.js");
      assert.equal(auth.isDevBypassAllowed(), false, "production never bypasses");
      // Missing header in production must throw (no fake identity).
      await assert.rejects(auth.verifyAuth({ headers: {}, url: "/api/x" }), /Authorization/);
    } finally {
      process.env = OLD;
    }
  });
});

describe("Prompt 49: ai-tutor-chat abuse caps", () => {
  it("validateChatInput accepts a normal conversation", async () => {
    const { validateChatInput } = await import("../server/handlers/ai-tutor-chat.js");
    const msgs = [
      { role: "user", content: "Explain photosynthesis." },
      { role: "assistant", content: "Sure — plants convert…" },
    ];
    assert.deepEqual(validateChatInput({ messages: msgs }), msgs);
  });

  it("validateChatInput rejects missing/oversized/malformed input", async () => {
    const { validateChatInput, CHAT_LIMITS } = await import("../server/handlers/ai-tutor-chat.js");
    assert.ok(CHAT_LIMITS.maxMessages <= 50 && CHAT_LIMITS.maxTotalChars <= 20000, "caps are bounded");
    assert.throws(() => validateChatInput({}), /messages/);
    assert.throws(() => validateChatInput({ messages: [] }), /1-50/);
    assert.throws(
      () => validateChatInput({ messages: Array.from({ length: 51 }, () => ({ role: "user", content: "x" })) }),
      /1-50/,
    );
    assert.throws(
      () => validateChatInput({ messages: [{ role: "user", content: "x".repeat(CHAT_LIMITS.maxCharsPerMessage + 1) }] }),
      /1-4000/,
    );
    assert.throws(() => validateChatInput({ messages: [{ role: "hacker", content: "x" }] }), /role/);
    assert.throws(
      () => validateChatInput({
        messages: Array.from({ length: 6 }, () => ({ role: "user", content: "x".repeat(4000) })),
      }),
      /too large/,
    );
  });

  it("handler enforces caps + per-instance rate friction before any model call", () => {
    const src = read("server/handlers/ai-tutor-chat.js");
    assert.ok(src.includes("validateChatInput(req.body)"), "caps enforced in handler");
    assert.ok(src.includes('rateLimit(rateLimitKey(req, "ai-tutor-chat")'), "per-instance rate friction");
    assert.ok(src.includes("429"), "over-limit returns 429");
    // Caps run inside the authed handler (requireAuth wrapper retained).
    assert.ok(src.includes("export default requireAuth(handler)"), "auth wrapper retained");
  });
});

describe("Prompt 49: tracked dev script carries no key literal", () => {
  it("test_genai.mjs uses the environment, not an embedded key", () => {
    const src = read("test_genai.mjs");
    assert.ok(!src.includes("AIza"), "no Google API-key literal");
    assert.ok(!/process\.env\.GEMINI_API_KEY\s*=\s*['"]\S+['"]/.test(src), "no hard-coded assignment");
  });
});
