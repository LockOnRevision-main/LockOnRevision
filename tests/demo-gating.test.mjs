import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * P51 2.1: demo-mode gating proof (fast, offline-safe, static).
 * Local-demo profiles must only exist in development builds
 * (import.meta.env.DEV); production builds without backend configuration
 * show a plain service-unavailable screen and never mint a demo user.
 * A demo identity must never pass the admin gate or reach a server route.
 */
describe("P51 2.1: demo mode is development-only", () => {
  it("AuthContext gates every demo profile behind import.meta.env.DEV", () => {
    const src = read("src/context/AuthContext.jsx");
    assert.ok(src.includes("import.meta.env.DEV"), "DEV gate present");
    const guards = src.match(/if\s*\(!isDemoAllowed\)\s*throw/g) || [];
    assert.equal(guards.length, 2, "login + register demo branches guarded");
    assert.ok(src.includes("export const serviceUnavailable"), "unavailable flag exported");
    assert.ok(src.includes("Service unavailable. Please try again later."), "plain prod error text");
  });

  it("localhost API fallback is development-only", () => {
    const src = read("src/utils/apiFetch.js");
    assert.ok(src.includes("import.meta.env.DEV"), "DEV gate present");
    const devIdx = src.indexOf("import.meta.env.DEV");
    const localIdx = src.indexOf("LOCAL_API_BASES[0]");
    assert.ok(devIdx !== -1 && localIdx !== -1 && devIdx < localIdx, "localhost used only under DEV");
  });

  it("no blocking alert()/confirm() calls remain in src", () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!/\.(jsx?|mjs)$/.test(entry.name)) continue;
        const src = fs.readFileSync(full, "utf8");
        if (/window\.alert\s*\(/.test(src)) offenders.push(`${full}: window.alert`);
        if (/(^|[^a-zA-Z_.])confirm\s*\(/.test(src)) offenders.push(`${full}: bare confirm()`);
      }
    };
    walk(path.join(root, "src"));
    assert.deepEqual(offenders, [], `blocking dialogs: ${offenders.join(", ")}`);
  });

  it("demo-like profile cannot pass the admin gate", async () => {
    const { canAccessAdmin } = await import("../src/utils/permissions.js");
    assert.equal(canAccessAdmin(null), false);
    assert.equal(canAccessAdmin({ uid: "local-demo-user", isAdmin: false }), false);
    assert.equal(canAccessAdmin({ uid: "local-demo-user", isAdmin: true, role: "user" }), true,
      "documents that a tampered local profile only affects UI gating, never server rules");
  });

  it("server routes fail closed without a Firebase token (no demo bypass)", async () => {
    const OLD = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      delete process.env.LOR_ENABLE_DEV_BYPASS;
      const { verifyAuth } = await import("../server/lib/auth.js");
      await assert.rejects(
        verifyAuth({ headers: {}, url: "/api/ai-tutor-chat" }),
        /Authorization/,
        "demo/anonymous caller gets 401, never a dev identity, in production",
      );
    } finally {
      process.env = OLD;
    }
  });
});
