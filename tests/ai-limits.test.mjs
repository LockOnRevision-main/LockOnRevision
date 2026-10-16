import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * P51 Stage 1.3: AI-route limits (fast, offline-safe — no Gemini calls).
 * - every POST AI action has a body-size cap, a text cap, and an
 *   authenticated-user rate limit in server/lib/aiLimits.js;
 * - oversized bodies get 413, rate excess gets 429 (via checkAiGuard);
 * - error bodies never name keys, prompts, or stacks;
 * - ai-status exposes no key names.
 */
function mockRes() {
  return {
    code: null, body: null,
    setHeader() {},
    status(c) { this.code = c; return this; },
    json(o) { this.body = o; return this; },
    end() { return this; },
  };
}

let ipCounter = 0;
function guardReq(body) {
  ipCounter += 1;
  return {
    body,
    headers: { "x-forwarded-for": `10.9.0.${ipCounter}` },
    socket: {},
    user: { uid: "limit-probe-user" },
  };
}

describe("P51 1.3: every POST AI route has limits", () => {
  it("AI_LIMITS covers all dispatcher POST actions", async () => {
    const ai = await import("../api/ai.js");
    const { AI_LIMITS } = await import("../server/lib/aiLimits.js");
    const postActions = Object.keys(ai.ACTIONS).filter((a) => a !== "ai-status");
    assert.ok(postActions.length >= 11, "expected AI actions present");
    for (const action of postActions) {
      const lim = AI_LIMITS[action];
      assert.ok(lim, `limits defined for ${action}`);
      assert.ok(lim.maxBodyChars > 0 && lim.maxTextChars > 0, `${action} caps positive`);
      assert.ok(lim.max > 0 && lim.windowMs > 0, `${action} rate limit positive`);
    }
  });

  it("oversized request bodies get 413 without touching the model", async () => {
    const { checkAiGuard, AI_LIMITS } = await import("../server/lib/aiLimits.js");
    const route = "generate-question-hint";
    const big = { question: { prompt: "x".repeat(AI_LIMITS[route].maxBodyChars + 1) } };
    const res = mockRes();
    assert.equal(checkAiGuard(guardReq(big), res, route), false);
    assert.equal(res.code, 413);
    assert.equal(res.body.code, "ai_too_large");
  });

  it("authenticated-user rate limit trips with 429", async () => {
    const { checkAiGuard, AI_LIMITS } = await import("../server/lib/aiLimits.js");
    const route = "generate-question-hint";
    const { max } = AI_LIMITS[route];
    const req = {
      body: { question: "short" },
      headers: { "x-forwarded-for": "10.8.0.77" },
      socket: {},
      user: { uid: "rate-probe-user" },
    };
    for (let i = 0; i < max; i += 1) {
      const res = mockRes();
      assert.equal(checkAiGuard(req, res, route), true, `call ${i + 1} allowed`);
    }
    const denied = mockRes();
    assert.equal(checkAiGuard(req, denied, route), false);
    assert.equal(denied.code, 429);
    assert.equal(denied.body.code, "ai_rate_limited");
  });

  it("oversized chat conversation is rejected at the handler (413)", async () => {
    const OLD = { ...process.env };
    try {
      process.env.NODE_ENV = "test";
      process.env.LOR_ENABLE_DEV_BYPASS = "1";
      const { handler } = await import("../server/handlers/ai-tutor-chat.js");
      const res = mockRes();
      await handler(
        {
          method: "POST",
          headers: {},
          body: { messages: [{ role: "user", content: "y".repeat(25000) }] },
        },
        res,
      );
      assert.ok([400, 413].includes(res.code), `rejected, got ${res.code}`);
    } finally {
      process.env = OLD;
    }
  });

  it("safe error bodies never reveal keys, prompts, or stacks", async () => {
    const { geminiUnavailable, aiFailed } = await import("../server/lib/aiLimits.js");
    for (const body of [geminiUnavailable(), aiFailed(), aiFailed("Custom safe text.")]) {
      const text = JSON.stringify(body);
      assert.ok(!/GEMINI|API_KEY|prompt|stack|sk-/i.test(text), `safe: ${text}`);
      assert.ok(typeof body.error === "string" && body.error.length > 0, "friendly message kept");
    }
  });

  it("no AI handler response names an environment variable", () => {
    const dir = path.join(root, "server", "handlers");
    const offenders = [];
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".js")) continue;
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      if (/Set GEMINI_API_KEY|as GEMINI_API_KEY|apiKeyName/.test(src)) {
        offenders.push(file);
      }
    }
    assert.deepEqual(offenders, [], `handlers naming env vars: ${offenders.join(", ")}`);
  });

  it("ai-status exposes availability without key names", async () => {
    const { default: status } = await import("../server/handlers/ai-status.js");
    const res = mockRes();
    await status({ method: "GET" }, res);
    assert.equal(res.code, 200);
    assert.ok(!("apiKeyName" in (res.body || {})), "no key-name field");
    assert.ok(!/GEMINI_API_KEY/.test(JSON.stringify(res.body)), "no key name in body");
    assert.ok(typeof res.body.configured === "boolean", "availability still reported");
  });
});
