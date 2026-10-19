import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * Prompt 50: school-scoped staff assignment + classroom overview wiring.
 * Fast static + wiring checks — no emulator needed.
 */
describe("Prompt 50: assign-staff guardrails", () => {
  it("dispatcher wires assign-staff (delegation, not copy)", async () => {
    const school = await import("../api/school.js");
    const direct = await import("../server/handlers/assign-staff.js");
    assert.equal(typeof school.ACTIONS["assign-staff"], "function");
    assert.equal(school.ACTIONS["assign-staff"], direct.default);
  });

  it("vercel rewrite preserves legacy path", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const rw = (vercel.rewrites || []).find((r) => r.source === "/api/assign-staff");
    assert.ok(rw, "rewrite for /api/assign-staff");
    assert.equal(rw.destination, "/api/school?action=assign-staff");
  });

  it("enforces staff.manage on the target school (whole-school scope)", () => {
    const src = read("server/handlers/assign-staff.js");
    assert.ok(
      src.includes('requirePermission(db, req, res, schoolId, "staff.manage")'),
      "school-wide gate on the TARGET school id",
    );
  });

  it("cannot grant platform or school-wide control", () => {
    const src = read("server/handlers/assign-staff.js");
    assert.ok(src.includes('"coordinator", "teacher"'), "allowlist is coordinator/teacher only");
    assert.ok(!src.match(/["']school_admin["']\s*[,}\]]/), "school_admin never assignable here");
    assert.ok(!src.includes('"admin"') || src.includes("platform-only"), "no platform role path");
    assert.ok(src.includes("cannot assign yourself"), "self-assignment rejected");
  });

  it("validates identity, school boundary, and audits atomically", () => {
    const src = read("server/handlers/assign-staff.js");
    assert.ok(src.includes("getAuth().getUser(uid)"), "existing verified user only");
    assert.ok(src.includes("School not found"), "missing school rejected");
    assert.ok(src.includes("Classroom does not belong to this school"), "classroom boundary checked");
    assert.ok(src.includes("writeStaffRecords"), "shared membership+ledger writer");
    assert.ok(src.includes("auditRef(db)") && src.includes("auditData("), "shared audit writer");
    assert.ok(src.includes("batch.set("), "audit commits atomically");
    assert.ok(!/await audit\(db/.test(src), "no standalone audit");
    assert.ok(!src.includes(".delete("), "never deletes");
    assert.ok(!src.includes('collection("users")'), "never touches learning records");
    assert.ok(src.includes('checkRate(req, res, "assign-staff"'), "rate-limited");
  });
});

describe("Prompt 50: overview exposes classrooms for the UI", () => {
  it("school-overview returns a capped classroom list (additive)", () => {
    const src = read("server/handlers/school-overview.js");
    assert.ok(src.includes("classrooms"), "classrooms included");
    assert.ok(src.includes(".limit(100)"), "bounded read");
    // Minimal fields only — never hash material or addresses.
    assert.ok(!src.includes("codeHash") && !src.includes("tokenHash"), "no secret hashes");
    assert.ok(!/\.email\b/.test(src), "no email field access");
  });
});
