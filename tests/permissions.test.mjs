import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATALOGUE_VERSION,
  PERMISSIONS,
  PERMISSION_NAMES,
  ROLE_DEFAULTS,
  defaultsForRole,
  effectivePermissions,
  hasEffectivePermission,
  validateOverrides,
  normaliseScopes,
  mayAct,
} from "../shared/permissionsCatalogue.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Stage 2: closed versioned catalogue", () => {
  it("catalogue is versioned, closed, and covers Prompt 47 needs", () => {
    assert.equal(CATALOGUE_VERSION, 1);
    for (const p of ["roster.view", "profile.view", "membership.assign",
      "membership.revoke", "pin.generate", "pin.revoke", "request.review",
      "policy.manage", "classroom.manage", "staff.manage", "report.view",
      "invite.manage", "permission.manage"]) {
      assert.ok(PERMISSION_NAMES.includes(p), `catalogue has ${p}`);
      assert.ok(typeof PERMISSIONS[p]?.description === "string", `${p} documented`);
    }
  });

  it("single source: backend, UI and legacy map derive from it", async () => {
    const ui = await import("../src/utils/schoolPermissions.js");
    assert.deepEqual(ui.ROLE_DEFAULTS, ROLE_DEFAULTS, "UI derives, no drift");
    const legacy = await import("../server/lib/authorization.js");
    assert.deepEqual(legacy.ROLE_PERMISSIONS, ROLE_DEFAULTS, "backend derives, no drift");
    for (const dotted of ["school.read", "membership.revoke", "student.read", "analytics.read"]) {
      assert.ok(legacy.LEGACY_PERMISSION_MAP[dotted], `legacy ${dotted} mapped`);
    }
  });
});

describe("Stage 2: backwards compatibility with Beta 1.9 defaults", () => {
  // Beta 1.9 fixed sets, restated here from the Prompt 45 final report §6
  // (canonical names). Staff WITHOUT overrides must behave EXACTLY so.
  const BETA_19 = {
    school_admin: ["school.view", "school.update", "policy.manage", "classroom.view",
      "classroom.manage", "membership.view", "membership.assign", "membership.revoke",
      "staff.view", "staff.manage", "roster.view", "profile.view", "report.view",
      "pin.generate", "pin.revoke", "request.review", "permission.manage"],
    coordinator: ["school.view", "classroom.view", "classroom.manage", "membership.view",
      "membership.assign", "roster.view", "profile.view", "report.view",
      "pin.generate", "pin.revoke", "request.review"],
    teacher: ["school.view", "classroom.view", "membership.view", "roster.view", "profile.view"],
    student: ["school.view", "classroom.view", "self.view"],
  };

  for (const [role, expected] of Object.entries(BETA_19)) {
    it(`${role}: no overrides == Beta 1.9 set`, () => {
      assert.deepEqual(new Set(effectivePermissions(role, {})), new Set(expected));
      assert.deepEqual(new Set(effectivePermissions(role)), new Set(expected));
      assert.deepEqual(new Set(defaultsForRole(role)), new Set(expected));
    });
  }

  it("teacher still cannot manage; admin wildcard holds", () => {
    assert.equal(hasEffectivePermission("teacher", {}, "membership.revoke"), false);
    assert.equal(hasEffectivePermission("teacher", {}, "policy.manage"), false);
    assert.equal(hasEffectivePermission("school_admin", {}, "membership.revoke"), true);
    assert.equal(hasEffectivePermission("platform_admin", {}, "anything.new"), true);
  });
});

describe("Stage 2: overrides, scopes, immediate effect", () => {
  it("grants add, denies subtract", () => {
    assert.ok(hasEffectivePermission("teacher", { grants: ["pin.generate"], denies: [] }, "pin.generate"));
    assert.equal(hasEffectivePermission("coordinator", { grants: [], denies: ["pin.generate"] }, "pin.generate"), false);
    // Base set untouched by sibling evaluation:
    assert.equal(hasEffectivePermission("teacher", {}, "pin.generate"), false);
  });

  it("unknown permission names rejected, never ignored", () => {
    assert.throws(() => validateOverrides({ grants: ["hack.everything"], denies: [] }), /Unknown permission/);
    assert.throws(() => validateOverrides({ grants: [], denies: ["*"] }), /Unknown permission/);
    assert.deepEqual(validateOverrides({ grants: ["pin.generate"], denies: [] }), { grants: ["pin.generate"], denies: [] });
  });

  it("scope enforcement via mayAct", () => {
    const whole = { isPlatform: false, role: "coordinator", overrides: {}, scopes: { scope: "all", classroomIds: [] } };
    const scoped = { isPlatform: false, role: "coordinator", overrides: {}, scopes: { scope: "classrooms", classroomIds: ["c1"] } };
    assert.equal(mayAct(whole, "request.review", "c9"), true);
    assert.equal(mayAct(scoped, "request.review", "c1"), true);
    assert.equal(mayAct(scoped, "request.review", "c9"), false);
    assert.equal(mayAct(scoped, "policy.manage", null), false, "school-wide needs whole scope");
    assert.equal(mayAct(whole, "policy.manage", null), false, "coordinator lacks policy.manage by default");
    assert.equal(mayAct({ isPlatform: true }, "invite.manage", null), true);
    assert.equal(mayAct(null, "roster.view", null), false);
  });

  it("normaliseScopes rejects garbage", () => {
    assert.deepEqual(normaliseScopes("all"), { scope: "all", classroomIds: [] });
    assert.deepEqual(normaliseScopes(["c1", "c1", 42]), { scope: "classrooms", classroomIds: ["c1"] });
    assert.throws(() => normaliseScopes({ scope: "everything" }), /Invalid access scopes/);
  });

  it("changes take effect on next evaluation (no claims involved)", () => {
    const staff = { isPlatform: false, role: "teacher", overrides: {}, scopes: { scope: "all", classroomIds: [] } };
    assert.equal(mayAct(staff, "pin.generate", null), false);
    staff.overrides = { grants: ["pin.generate"], denies: [] }; // set-permissions write
    assert.equal(mayAct(staff, "pin.generate", null), true, "immediate, server-side");
  });
});

describe("Stage 2: every route covered by the catalogue", () => {
  // Route → catalogue permissions it must check. Fails if a route stops
  // checking (or a permission is renamed without updating callers).
  const COVERAGE = {
    "server/handlers/create-pin.js": ["pin.generate"],
    "server/handlers/revoke-pin.js": ["pin.revoke"],
    "server/handlers/review-request.js": ["request.review"],
    "server/handlers/set-join-policy.js": ["policy.manage"],
    "server/handlers/search-students.js": ["roster.view"],
    "server/handlers/student-profile.js": ["profile.view"],
    "server/handlers/manage-membership.js": ["membership.assign", "membership.revoke"],
    "server/handlers/school-overview.js": ["roster.view"],
    "server/handlers/set-permissions.js": ["permission.manage"],
    "server/handlers/get-permissions.js": [],
  };

  for (const [file, perms] of Object.entries(COVERAGE)) {
    it(`${file} checks ${perms.join(", ") || "(role-gated read)"}`, () => {
      const src = read(file);
      for (const p of perms) {
        assert.ok(PERMISSION_NAMES.includes(p), `${p} is a catalogue permission`);
        assert.ok(src.includes(`"${p}"`), `${file} enforces ${p} server-side`);
      }
      assert.ok(src.includes("requirePermission") || src.includes("requireSchoolStaff") || src.includes("resolveStaff"), `${file}: shared helper, no ad-hoc logic`);
    });
  }

  it("platform-only routes stay platform-gated (invite.manage reserved)", () => {
    for (const f of ["server/handlers/provision-school.js", "server/handlers/revoke-school-admin.js",
      "server/handlers/create-invitation.js", "server/handlers/resend-invitation.js",
      "server/handlers/revoke-invitation.js", "server/handlers/list-invitations.js"]) {
      assert.ok(read(f).includes("isPlatformAdmin"), `${f}: platform gate`);
    }
    assert.ok(PERMISSION_NAMES.includes("invite.manage"), "catalogue ready for Part 2");
  });
});

describe("Stage 2: escalation prevention in set-permissions", () => {
  it("route contract: editor gate, holding check, scope containment, audit", () => {
    const src = read("server/handlers/set-permissions.js");
    assert.ok(src.includes("permission.manage"), "editor needs the meta permission");
    assert.ok(src.includes("EDITOR_ROLES"), "teacher/student can never edit");
    assert.ok(src.includes("You do not hold permission"), "no granting what you lack");
    assert.ok(src.includes("Scope exceeds your own access"), "no wider scope");
    assert.ok(src.includes("Only staff assignments are configurable"), "students excluded");
    assert.ok(src.includes("validateOverrides"), "unknown names rejected");
    assert.ok(src.includes("permission.change"), "audited with before/after");
    assert.ok(src.includes("before") && src.includes("after"), "before/after values");
  });
});
