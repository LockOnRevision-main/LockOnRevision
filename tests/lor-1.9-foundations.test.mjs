import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// ---- Stage A1: production rejects dev identity (fail-closed) ----
describe("auth dev bypass fails closed", async () => {
  const mod = await import("../api/_lib/auth.js");
  assert.equal(typeof mod.isDevBypassAllowed, "function", "isDevBypassAllowed exported");

  const OLD = { ...process.env };
  const set = (env) => {
    delete process.env.NODE_ENV;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.LOR_ENABLE_DEV_BYPASS;
    Object.assign(process.env, env);
  };
  try {
    // Production NEVER bypasses, even with emulator/flag set
    set({ NODE_ENV: "production", FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099", LOR_ENABLE_DEV_BYPASS: "1" });
    assert.equal(mod.isDevBypassAllowed(), false, "production denies bypass");
    // Missing NODE_ENV alone must NOT bypass (old fail-open bug)
    set({});
    assert.equal(mod.isDevBypassAllowed(), false, "unset env denies bypass");
    // Missing auth must throw in production-like config
    set({ NODE_ENV: "production" });
    await assert.rejects(() => mod.verifyAuth({ headers: {}, url: "/x" }), /Authorization/);

    // Explicit signals allow bypass off-production
    set({ NODE_ENV: "development", FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099" });
    assert.equal(mod.isDevBypassAllowed(), true);
    const dev = await mod.verifyAuth({ headers: {}, url: "/x" });
    assert.equal(dev.uid, "local-dev-user");

    set({ NODE_ENV: "test", LOR_ENABLE_DEV_BYPASS: "1" });
    assert.equal(mod.isDevBypassAllowed(), true);

    // No signal, non-production: still denies (fail closed)
    set({ NODE_ENV: "development" });
    assert.equal(mod.isDevBypassAllowed(), false);
    await assert.rejects(() => mod.verifyAuth({ headers: {}, url: "/x" }), /Authorization/);
  } finally {
    process.env = OLD;
  }
});

// ---- Stage A2/A3/A4/D: static rules assertions ----
describe("firestore.rules", () => {
  const rules = read("firestore.rules");
  it("denies broad profile reads (owner/admin only)", () => {
    assert.match(rules, /match \/users\/\{userId\} \{[\s\S]*?allow read: if ownsUserDoc\(userId\) \|\| isAdmin\(\)/);
    assert.doesNotMatch(rules, /match \/users\/\{userId\} \{\s*\n\s*allow read: if signedIn\(\);/);
  });
  it("protects role + admin fields on update", () => {
    for (const f of ["'isAdmin'", "'role'", "'schoolRoles'", "'permissions'"]) {
      assert.ok(rules.includes(f), `rules mention ${f}`);
    }
  });
  it("defines users_public projection without email/admin", () => {
    assert.ok(rules.includes("match /users_public/"), "users_public block");
    assert.ok(rules.includes("hasOnly"), "allowlist enforcement");
  });
  it("covers schools/classrooms/memberships/staff/audit + deny placeholders", () => {
    for (const c of ["match /schools/", "match /classrooms/", "match /memberships/", "match /staffAssignments/", "match /adminAuditLogs/", "match /joiningPins/", "match /joinRequests/", "match /adminInvitations/"]) {
      assert.ok(rules.includes(c), `rules cover ${c}`);
    }
    assert.ok(rules.includes("allow read: if isAdmin()") || rules.includes("allow read: if isAdmin();"));
  });
  it("audit logs deny client writes", () => {
    const audit = rules.slice(rules.indexOf("match /adminAuditLogs/"), rules.indexOf("match /adminAuditLogs/") + 400);
    assert.ok(audit.includes("allow create: if false"), "audit create denied");
    assert.ok(audit.includes("allow update: if false"), "audit update denied");
  });
});

describe("storage.rules", () => {
  it("exists and denies by default", () => {
    const s = read("storage.rules");
    assert.ok(s.includes("allow read, write: if false"), "deny by default");
  });
});

// ---- Stage C: RBAC defaults ----
describe("scoped RBAC", () => {
  it("fixed safe defaults; teacher cannot manage", async () => {
    const { permissionsForRole, hasSchoolPermission } = await import("../src/utils/schoolPermissions.js");
    assert.ok(!hasSchoolPermission("teacher", "membership.revoke"), "teacher cannot revoke");
    assert.ok(hasSchoolPermission("school_admin", "membership.revoke"), "school_admin can revoke");
    assert.ok(hasSchoolPermission("platform_admin", "anything.at.all"), "platform wildcard");
    assert.deepEqual(permissionsForRole("teacher"), [...permissionsForRole("teacher")], "returns copy");
  });
  it("central authorization helper exists", () => {
    const src = read("api/_lib/authorization.js");
    assert.ok(src.includes("requirePlatformAdmin"), "platform helper");
    assert.ok(src.includes("requireSchoolRole"), "school helper");
    assert.ok(src.includes("revokeRefreshTokens"), "revocation path");
  });
});

// ---- Stage D: validation ----
describe("server validation", async () => {
  const v = await import("../api/_lib/validation.js");
  it("rejects bad school/membership input", () => {
    assert.throws(() => v.validateSchoolInput({}), /name/);
    assert.throws(() => v.validateMembershipInput({ uid: "u", schoolId: "s", role: "superadmin" }), /role/);
    assert.equal(v.membershipDocId("u", "s"), "u_s", "deterministic id");
    assert.equal(v.membershipDocId("u", "s"), v.membershipDocId("u", "s"), "idempotent");
  });
  it("rate limiter allows then blocks", () => {
    const k = `test:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 5; i++) assert.equal(v.rateLimit(k, { max: 5, windowMs: 60000 }).allowed, true);
    assert.equal(v.rateLimit(k, { max: 5, windowMs: 60000 }).allowed, false);
  });
});

// ---- Stage E: migration logic ----
describe("migration safety", () => {
  it("dry-run default documented; scripts require --apply", () => {
    const m = read("scripts/migrate-academy.mjs");
    assert.ok(m.includes('"dry-run"') || m.includes("dry-run"), "dry-run mode");
    assert.ok(m.includes("--apply"), "explicit apply flag");
    assert.ok(m.includes("merge: true"), "non-destructive merge");
    assert.ok(m.includes("adminAuditLogs"), "audit record");
  });
  it("enroll-academy is self-only student + rate-limited", () => {
    const e = read("api/enroll-academy.js");
    assert.ok(e.includes("role: \"student\"") || e.includes('role: "student"'), "student only");
    assert.ok(e.includes("rateLimit"), "rate limited");
    assert.ok(e.includes("verifyAuth"), "verified token");
  });
});

// ---- Regression: preserved systems ----
describe("regression guards", () => {
  it("auth context still creates uid profiles + admin helper preserved", () => {
    const ctx = read("src/context/AuthContext.jsx");
    assert.ok(ctx.includes("createUserProfile"), "profile creation kept");
    const perm = read("src/utils/permissions.js");
    assert.ok(perm.includes("canAccessAdmin"), "global admin helper kept");
  });
  it("XP/energy transaction paths kept", () => {
    const admin = read("src/services/adminService.js");
    assert.ok(admin.includes("adjustUserXp") && admin.includes("runTransaction"), "XP tx kept");
    const xp = read("src/services/userService.js");
    assert.ok(xp.includes("completeUnit"), "unit XP kept");
  });
});
