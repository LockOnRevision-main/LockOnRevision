import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  makeSchoolState, canReadSchool, canManageSchool, canTeachSchool,
  canReadMembership, searchableSchools, isPlatformAdmin,
} from "./helpers/schoolAuth.js";

/**
 * Stage 0 baseline: cross-school isolation matrix. Must stay green through
 * every later stage. Mirrors firestore.rules; emulator runbook in
 * docs/EMULATOR_TESTS.md proves the real rules match.
 */
describe("Stage 0: cross-school isolation baseline", () => {
  const s = makeSchoolState();

  it("anon reads nothing", () => {
    assert.equal(canReadSchool(s, null, "school-a"), false);
    assert.equal(canManageSchool(s, null, "school-a"), false);
    assert.deepEqual(searchableSchools(s, null), []);
  });

  it("students cannot manage or search", () => {
    assert.equal(canManageSchool(s, "stu-a", "school-a"), false);
    assert.equal(canTeachSchool(s, "stu-a", "school-a"), false);
    assert.deepEqual(searchableSchools(s, "stu-a"), []);
    assert.equal(canReadSchool(s, "stu-a", "school-a"), true); // own school readable
  });

  it("School A admin cannot touch School B", () => {
    assert.equal(canReadSchool(s, "adm-a", "school-b"), false);
    assert.equal(canManageSchool(s, "adm-a", "school-b"), false);
    assert.equal(canTeachSchool(s, "adm-a", "school-b"), false);
    assert.equal(
      canReadMembership(s, "adm-a", { uid: "x", schoolId: "school-b" }), false);
    assert.ok(!searchableSchools(s, "adm-a").includes("school-b"));
    assert.ok(searchableSchools(s, "adm-a").includes("school-a"));
  });

  it("mirror: School B admin cannot touch School A", () => {
    assert.equal(canReadSchool(s, "adm-b", "school-a"), false);
    assert.equal(canManageSchool(s, "adm-b", "school-a"), false);
  });

  it("teacher read-only within own school", () => {
    assert.equal(canReadSchool(s, "tch-a", "school-a"), true);
    assert.equal(canManageSchool(s, "tch-a", "school-a"), false);
    assert.equal(canTeachSchool(s, "tch-a", "school-a"), false);
    assert.equal(canReadMembership(s, "tch-a", { uid: "stu-a", schoolId: "school-a" }), true);
    assert.equal(canReadMembership(s, "tch-a", { uid: "y", schoolId: "school-b" }), false);
  });

  it("platform admin oversees all schools", () => {
    assert.equal(isPlatformAdmin(s, "platform-1"), true);
    assert.equal(canReadSchool(s, "platform-1", "school-a"), true);
    assert.equal(canReadSchool(s, "platform-1", "school-b"), true);
    assert.equal(canManageSchool(s, "platform-1", "school-b"), true);
    assert.deepEqual(searchableSchools(s, "platform-1"), ["*"]);
  });

  it("removed membership revokes immediately", () => {
    const s2 = makeSchoolState();
    s2.memberships["adm-a_school-a"].status = "removed";
    assert.equal(canReadSchool(s2, "adm-a", "school-a"), false);
    assert.equal(canManageSchool(s2, "adm-a", "school-a"), false);
  });
});
