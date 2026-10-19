import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("set-school-admin: existing-school administrator assignment", () => {
  const src = read("server/handlers/set-school-admin.js");

  it("is platform-admin only with explicit denial", () => {
    assert.ok(src.includes("isPlatformAdmin(db, user.uid)"), "platform gate");
    assert.ok(src.includes("403") && src.includes("Platform admin required"), "explicit 403 denial");
  });

  it("validates school and target user via canonical Firebase UID", () => {
    assert.ok(src.includes("School not found."), "existing school required");
    assert.ok(src.includes("getAuth().getUser(uid)"), "existing verified user check");
    assert.ok(src.includes("Invalid schoolId"), "schoolId validation");
    assert.ok(src.includes("Invalid uid"), "uid validation");
  });

  it("assigns school_admin scoped to the school, never platform admin", () => {
    assert.ok(src.includes('role: "school_admin"'), "school-scoped role");
    assert.ok(src.includes("writeStaffRecords"), "shared membership+ledger writer");
    assert.ok(!src.includes("isAdmin = true"), "does not grant platform-admin status");
    assert.ok(!src.includes('role: "admin"'), "never grants admin role");
  });

  it("is idempotent and preserves other-school memberships", () => {
    assert.ok(src.includes("already: true"), "idempotent re-assignment");
    assert.ok(src.includes("membershipId(uid, schoolId)"), "deterministic doc id");
    assert.ok(!src.includes(".delete("), "never deletes memberships/users");
    assert.ok(!src.includes('collection("users")'), "never touches user/learning records");
  });

  it("commits membership + ledger + audit atomically in one batch", () => {
    assert.ok(src.includes("const batch = db.batch()"), "write batch");
    assert.ok(src.includes("batch.set(auditRef(db)"), "audit in same batch");
    assert.ok(src.includes("await batch.commit()"), "single commit");
  });

  it("is auth-gated and rate-limited", () => {
    assert.ok(src.includes("authedUser"), "verified token");
    assert.ok(src.includes('checkRate(req, res, "set-school-admin"'), "rate-limited");
  });

  it("dispatcher wires set-school-admin (delegation, not copy)", async () => {
    const school = await import("../api/school.js");
    const direct = await import("../server/handlers/set-school-admin.js");
    assert.equal(typeof school.ACTIONS["set-school-admin"], "function");
    assert.equal(school.ACTIONS["set-school-admin"], direct.default);
  });
});

describe("manage-membership: Academy safeguard", () => {
  const src = read("server/handlers/manage-membership.js");
  it("denies removing Academy membership", () => {
    assert.ok(src.includes('schoolId === "academy"'), "Academy guard present");
    assert.ok(src.includes('"Academy membership cannot be removed."'), "explicit denial");
  });
});
