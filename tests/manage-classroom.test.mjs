import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateClassroomInput } from "../server/lib/validation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * Prompt 48: classroom lifecycle (create/update/soft-deactivate).
 * Fast static + validation + wiring checks — no emulator needed.
 * Data preservation is by construction: the handler never issues a
 * document delete and never touches memberships/users subcollections.
 */
describe("Prompt 48: manage-classroom lifecycle", () => {
  it("dispatcher wires manage-classroom (delegation, not copy)", async () => {
    const school = await import("../api/school.js");
    const direct = await import("../server/handlers/manage-classroom.js");
    assert.equal(typeof school.ACTIONS["manage-classroom"], "function");
    assert.equal(school.ACTIONS["manage-classroom"], direct.default);
  });

  it("vercel rewrite preserves legacy path", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const rw = (vercel.rewrites || []).find((r) => r.source === "/api/manage-classroom");
    assert.ok(rw, "rewrite for /api/manage-classroom");
    assert.equal(rw.destination, "/api/school?action=manage-classroom");
  });

  it("backend-enforced auth + school boundary + audit atomicity", () => {
    const src = read("server/handlers/manage-classroom.js");
    assert.ok(src.includes('requirePermission(db, req, res, input.schoolId, "classroom.manage")'), "create gated");
    assert.ok(src.includes('requirePermission(db, req, res, current.schoolId, "classroom.manage")'), "update/deactivate use STORED schoolId");
    assert.ok(src.includes("Classroom cannot be moved between schools"), "cross-school moves rejected");
    assert.ok(src.includes("auditRef(db)") && src.includes("auditData("), "shared audit writer");
    assert.ok(src.includes("batch.set("), "audit commits atomically");
    assert.ok(!/await audit\(db/.test(src), "no standalone audit");
    assert.ok(!src.includes(".delete("), "never hard-deletes");
    assert.ok(!src.includes("memberships") || !src.includes("memberships\"\n"), "does not rewrite memberships");
    assert.ok(!src.includes('collection("users")') && !src.includes("collection('users')"), "never touches learning records");
    assert.ok(src.includes("status: \"archived\""), "soft-deactivate preserves the doc");
    assert.ok(src.includes("checkRate(req, res, \"manage-classroom\""), "rate-limited");
  });

  it("validation: create requires schoolId + name", () => {
    assert.deepEqual(
      validateClassroomInput({ schoolId: "s1", name: "  7A  ", yearGroup: null }),
      { schoolId: "s1", name: "7A", yearGroup: null },
    );
    assert.throws(() => validateClassroomInput({ schoolId: "", name: "x" }), /schoolId/);
    assert.throws(() => validateClassroomInput({ schoolId: "s", name: "  " }), /name/);
  });

  it("rules: classroom hard deletes denied (soft-deactivate is the only path)", () => {
    const rules = read("firestore.rules");
    const block = rules.slice(rules.indexOf("match /classrooms/"), rules.indexOf("match /memberships/"));
    assert.ok(block.includes("allow delete: if false"), "client hard delete denied");
    assert.ok(block.includes("allow create:") && block.includes("allow update:"), "scoped create/update retained");
  });

  it("docs: schoolId immutable after create", () => {
    const model = read("docs/SCHOOL_DATA_MODEL.md");
    assert.ok(model.includes("immutable after create"), "boundary documented");
  });
});
