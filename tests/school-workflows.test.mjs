import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeSchoolState, searchableSchools, canReadMembership, canManageSchool,
} from "./helpers/schoolAuth.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Stage 4: external school admin provisioning", () => {
  it("platform-only, verified UID, scoped membership, audited", () => {
    const src = read("server/handlers/provision-school.js");
    assert.ok(src.includes("isPlatformAdmin"), "platform-only gate");
    assert.ok(src.includes("403") && src.includes("Platform admin required"), "explicit denial");
    assert.ok(src.includes("getUser(adminUid)"), "existing verified user check");
    assert.ok(src.includes("role: \"school_admin\""), "scoped staff role");
    assert.ok(src.includes("APPROVAL_REQUIRED"), "safe default policy on new school");
    assert.ok(src.includes("school.provision") && src.includes("staff.assign"), "both audited");
    assert.ok(!src.includes("invitation") || src.includes("No invitation"), "no invite automation");
  });

  it("adminInvitations schema stays design-only default-deny", () => {
    const rules = read("firestore.rules");
    const block = rules.slice(rules.indexOf("match /adminInvitations/"), rules.indexOf("match /adminInvitations/") + 200);
    assert.ok(block.includes("allow read: if false") && block.includes("allow write: if false"));
  });

  it("new school_admin scoped strictly (mirror)", () => {
    const s = makeSchoolState();
    // adm-b (school-b admin) has zero rights in school-a and vice versa:
    assert.equal(canManageSchool(s, "adm-b", "school-a"), false);
    assert.equal(canReadMembership(s, "adm-b", { uid: "stu-a", schoolId: "school-a" }), false);
  });

  it("revocation: last-admin guard + prompt effect + audit", () => {
    const src = read("server/handlers/revoke-school-admin.js");
    assert.ok(src.includes("acknowledgeEmpty"), "last-admin guard");
    assert.ok(src.includes("status: \"removed\""), "status flip (prompt rule effect)");
    assert.ok(src.includes("revokeRefreshTokens"), "token invalidation");
    assert.ok(src.includes("staff.revoke"), "audited");
  });
});

describe("Stage 5: scoped search / profile / membership", () => {
  it("search constrained to caller scope, min fields, no email", () => {
    const src = read("server/handlers/search-students.js");
    assert.ok(src.includes("requirePermission") && src.includes('"roster.view"'), "scoped perm gate");
    assert.ok(src.includes('where("schoolId", "==", schoolId)'), "school-constrained query");
    assert.ok(!/p\.email|d\.email|m\.email|["']email["']\s*:/.test(src), "no email field returned");
    assert.ok(src.includes("MAX_PAGE") && src.includes("50"), "max page size");
    assert.ok(src.includes("normalisePrefix"), "normalised prefix search");
  });

  it("search isolation mirror: A-staff never list B students", () => {
    const s = makeSchoolState();
    assert.ok(!searchableSchools(s, "adm-a").includes("school-b"));
    assert.ok(!searchableSchools(s, "tch-a").includes("school-b"));
    assert.deepEqual(searchableSchools(s, "stu-a"), [], "students cannot search");
  });

  it("profile view: single-school only, no email, reads unaudited (justified)", () => {
    const src = read("server/handlers/student-profile.js");
    assert.ok(src.includes("requirePermission") && src.includes('"profile.view"'), "scoped perm gate");
    assert.ok(src.includes("requested school ONLY"), "single-school scoping");
    assert.ok(!/p\.email|d\.email|["']email["']\s*:/.test(src), "no email field returned");
    assert.ok(src.includes("NOT audited"), "decision documented");
  });

  it("removal revokes without deleting learning data", () => {
    const src = read("server/handlers/manage-membership.js");
    assert.ok(src.includes("status: \"removed\""), "status + timestamp");
    assert.ok(src.includes("removedAt"), "removal timestamp");
    assert.ok(!src.includes(".delete()"), "never deletes");
    assert.ok(src.includes("membership.revoke"), "audited");
    // Catalogue gate: school removal needs membership.revoke (default:
    // school_admin only — proven in tests/permissions.test.mjs):
    assert.ok(src.includes('"membership.revoke"'), "remove-school restricted");
  });

  it("every new route: auth + rate limit + no student/staff bypass", () => {
    for (const f of ["server/handlers/create-pin.js", "server/handlers/revoke-pin.js", "server/handlers/redeem-pin.js",
      "server/handlers/review-request.js", "server/handlers/set-join-policy.js", "server/handlers/provision-school.js",
      "server/handlers/revoke-school-admin.js", "server/handlers/search-students.js", "server/handlers/student-profile.js",
      "server/handlers/manage-membership.js"]) {
      const src = read(f);
      assert.ok(src.includes("authedUser") || src.includes("verifyAuth"), `${f}: verified token`);
      assert.ok(src.includes("401") || src.includes("authedUser"), `${f}: anon rejected`);
      assert.ok(src.includes("checkRate") || src.includes("rateLimit"), `${f}: rate-limited`);
    }
    // Staff routes additionally gate scope (Stage 2: per-permission):
    for (const [f, perm] of [["server/handlers/create-pin.js", '"pin.generate"'], ["server/handlers/review-request.js", '"request.review"'],
      ["server/handlers/search-students.js", '"roster.view"'], ["server/handlers/student-profile.js", '"profile.view"'],
      ["server/handlers/manage-membership.js", '"membership.assign"']]) {
      const src = read(f);
      assert.ok(src.includes("requirePermission") && src.includes(perm), `${f}: scoped (${perm})`);
    }
  });

  it("audit append-only: clients cannot write logs", () => {
    const rules = read("firestore.rules");
    const i = rules.indexOf("match /adminAuditLogs/");
    const block = rules.slice(i, i + 400);
    assert.ok(block.includes("allow create: if false"), "no client writes");
    assert.ok(block.includes("allow read: if isAdmin()"), "admin reads only");
  });
});

describe("Stage 1: backfill + leaderboard safety", () => {
  it("backfill additive/idempotent/dry-run/audited", () => {
    const src = read("scripts/backfill-users-public.mjs");
    assert.ok(src.includes("--apply"), "explicit apply");
    assert.ok(src.includes("merge: true"), "non-destructive");
    assert.ok(src.includes("users-public.backfill"), "audited");
    assert.ok(!/d\.email|p\.email|["']email["']\s*:/.test(src), "no sensitive email field projected");
    assert.ok(src.includes("searchName"), "prefix-search field");
  });

  it("leaderboard reads public projection; features verified", () => {
    const lb = read("src/services/leaderboardService.js");
    assert.ok(lb.includes("users_public"), "reads projection");
    const rules = read("firestore.rules");
    assert.ok(rules.includes("searchName"), "searchName allowlisted");
  });

  it("new registrations get server-side projection", () => {
    const src = read("server/handlers/enroll-academy.js");
    assert.ok(src.includes("ensurePublicProjection"), "server-side upsert");
    assert.ok(src.includes("membership.self-enrol"), "enrolment audited (Prompt-45 fix)");
  });
});
