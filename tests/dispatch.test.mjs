import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Stage 0.5: dispatcher consolidation contract. Hobby allows 12 functions
 * per deployment; 31 single-file routes exceeded it. api/school.js +
 * api/ai.js delegate to server/handlers/ (imported, never copied), so
 * behaviour is preserved by construction — these tests prove the wiring:
 * every legacy path rewrites to a live action, unknown actions 404,
 * unauthenticated callers still get 401 through delegation.
 */
function mockRes() {
  return {
    code: null, body: null, ended: false,
    setHeader() {},
    status(c) { this.code = c; return this; },
    json(o) { this.body = o; return this; },
    end() { this.ended = true; return this; },
  };
}

describe("Stage 0.5: function count within Hobby limit", () => {
  it("api/ exposes exactly 2 entrypoints (<= 12)", () => {
    const entries = fs.readdirSync(path.join(root, "api")).filter((f) => f.endsWith(".js"));
    assert.deepEqual(entries.sort(), ["ai.js", "school.js"]);
  });

  it("every legacy path has a vercel.json rewrite to a dispatcher action", () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
    const rewrites = vercel.rewrites || [];
    const legacy = [
      ["create-pin", "school"], ["revoke-pin", "school"], ["redeem-pin", "school"],
      ["set-join-policy", "school"], ["review-request", "school"], ["provision-school", "school"],
      ["revoke-school-admin", "school"], ["search-students", "school"], ["student-profile", "school"],
      ["manage-membership", "school"], ["manage-classroom", "school"], ["assign-staff", "school"], ["school-overview", "school"], ["enroll-academy", "school"],
      ["set-permissions", "school"], ["get-permissions", "school"], ["create-invitation", "school"],
      ["resend-invitation", "school"], ["revoke-invitation", "school"], ["accept-invitation", "school"],
      ["list-invitations", "school"],
      ["ai-status", "ai"], ["ai-tutor-chat", "ai"], ["ask-forge-assistant", "ai"],
      ["generate-forge-structure", "ai"], ["process-uploaded-notes", "ai"], ["extract-timetable-docs", "ai"],
      ["generate-learning-content", "ai"], ["generate-question-hint", "ai"], ["explain-wrong-answer", "ai"],
      ["generate-timetable", "ai"], ["generate-daily-challenge", "ai"], ["delete-cloudinary-files", "ai"],
    ];
    assert.equal(legacy.length, 33, "all 33 former routes covered");
    for (const [name, disp] of legacy) {
      const rw = rewrites.find((r) => r.source === `/api/${name}`);
      assert.ok(rw, `rewrite for /api/${name}`);
      assert.equal(rw.destination, `/api/${disp}?action=${name}`);
    }
  });
});

describe("Stage 0.5: delegation preserves behaviour", () => {
  it("every action resolves to a handler function", async () => {
    const school = await import("../api/school.js");
    const ai = await import("../api/ai.js");
    assert.equal(Object.keys(school.ACTIONS).length, 22);
    assert.equal(Object.keys(ai.ACTIONS).length, 12);
    for (const [name, fn] of [...Object.entries(school.ACTIONS), ...Object.entries(ai.ACTIONS)]) {
      assert.equal(typeof fn, "function", `${name} delegates to a function`);
    }
  });

  it("unknown action -> 404 (both dispatchers)", async () => {
    const school = (await import("../api/school.js")).default;
    const ai = (await import("../api/ai.js")).default;
    for (const fn of [school, ai]) {
      const res = mockRes();
      await fn({ method: "POST", query: { action: "nope" }, body: {}, headers: {} }, res);
      assert.equal(res.code, 404);
    }
  });

  it("unauthenticated caller still gets 401 through delegation", async () => {
    const OLD = { ...process.env };
    try {
      process.env.NODE_ENV = "production"; // dev bypass off: no header must 401
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      delete process.env.LOR_ENABLE_DEV_BYPASS;
      const school = (await import("../api/school.js")).default;
      const res = mockRes();
      await school(
        { method: "POST", query: { action: "search-students" }, body: { schoolId: "s" }, headers: {} },
        res,
      );
      assert.equal(res.code, 401, "auth enforced through dispatcher");
    } finally {
      process.env = OLD;
    }
  });

  it("handler modules unchanged in place (delegation, not rewrite)", async () => {
    // Spot-check: delegated function identity equals the module default.
    const school = await import("../api/school.js");
    const direct = await import("../server/handlers/search-students.js");
    assert.equal(school.ACTIONS["search-students"], direct.default);
    const ai = await import("../api/ai.js");
    const aiDirect = await import("../server/handlers/ai-status.js");
    assert.equal(ai.ACTIONS["ai-status"], aiDirect.default);
  });
});
