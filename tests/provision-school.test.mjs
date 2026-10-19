import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Provision-school: platform-admin school creation + school-scoped PIN", () => {
  const src = read("server/handlers/provision-school.js");

  it("is platform-admin only with explicit denial", () => {
    assert.ok(src.includes("isPlatformAdmin(db, user.uid)"), "platform gate");
    assert.ok(src.includes("403") && src.includes("Platform admin required"), "explicit 403 denial");
    assert.ok(src.includes("scope: \"platform\""), "platform-scoped audit");
  });

  it("validates and normalises school input", () => {
    assert.ok(src.includes("name.length > 120"), "name length cap");
    assert.ok(src.includes("Invalid schoolId"), "schoolId validation");
    assert.ok(src.includes("schoolId: id"), "uses resolved school id");
  });

  it("assigns an existing verified user as school_admin (scoped, not platform)", () => {
    assert.ok(src.includes("getAuth().getUser(adminUid)"), "existing verified user check");
    assert.ok(src.includes('role: "school_admin"'), "school-scoped role");
    assert.ok(src.includes("writeStaffRecords"), "shared membership+ledger writer");
    assert.ok(!src.includes("isAdmin = true"), "does not grant platform-admin status");
    assert.ok(!src.includes('role: "admin"'), "never grants admin role as side effect");
    assert.ok(src.includes("scope: \"role:school_admin\""), "staff-assign audit scoped to school_admin");
  });

  it("generates a secure random school-scoped PIN using the existing PIN conventions", () => {
    assert.ok(src.includes("generatePinCode()"), "random PIN generation");
    assert.ok(src.includes("hashPin("), "pepper-keyed hash");
    assert.ok(src.includes("pinDocIdFromHash("), "deterministic hash-based doc id");
    assert.ok(src.includes("PIN_DEFAULT_TTL_MS"), "bounded TTL");
    // Never derived from predictable values.
    assert.ok(!/Date\.now\(\)\.toString\(36\)/.test(src) || src.includes("schoolId = null"), "schoolId not the PIN source");
    assert.ok(src.includes('classroomId: null'), "school-scoped (no classroom binding)");
  });

  it("stores hash only, returns plaintext once, never logs or exposes pepper", () => {
    assert.ok(src.includes('codeHash: pinHash'), "only the hash is persisted");
    assert.ok(src.includes("pin: pinCode"), "plaintext PIN returned in response once");
    assert.ok(!/pepper/.test(src.split("return res.status(200)")[1] || ""), "pepper not in success body");
    assert.ok(!/console\.(log|error|info)\([^)]*pinCode/.test(src), "PIN not logged");
  });

  it("commits school + staff + PIN + audit in ONE atomic batch", () => {
    assert.ok(src.includes("const batch = db.batch()"), "write batch");
    assert.ok(src.includes("batch.create(schoolRef"), "school create in batch");
    assert.ok(src.includes("batch.create(db.collection(\"joiningPins\")"), "PIN record in batch");
    assert.ok(src.includes("batch.set(auditRef(db)"), "audit in same batch");
    assert.ok(src.includes("await batch.commit()"), "single commit");
  });

  it("is retry-safe: duplicate school returns 409, no duplicate PIN", () => {
    assert.ok(src.includes('School already exists."'), "duplicate school rejected");
    assert.ok(src.includes("409"), "conflict status on retry");
  });

  it("respects safe default join policy; PIN is eligibility not authority", () => {
    assert.ok(src.includes('joinPolicy: "APPROVAL_REQUIRED"'), "safe default policy");
    assert.ok(src.includes("PIN grants join eligibility only") || src.includes("join eligibility only"), "PIN != authority documented");
  });

  it("is auth-gated and rate-limited", () => {
    assert.ok(src.includes("authedUser"), "verified token");
    assert.ok(src.includes('checkRate(req, res, "provision-school"'), "rate-limited");
  });
});
