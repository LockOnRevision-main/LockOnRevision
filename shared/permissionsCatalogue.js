/**
 * Shared permission catalogue (Beta 2.0 Part 1 — Stage 2). SINGLE SOURCE
 * for `api/` (enforcement) and `src/` (UI gating) — both import this file,
 * so the two cannot drift. Plain ESM, zero dependencies.
 *
 * Non-breaking extension of the Beta 1.9 fixed defaults: staff assignments
 * WITHOUT explicit overrides behave EXACTLY as before (proven by
 * tests/permissions.test.mjs backwards-compatibility cases).
 */

export const CATALOGUE_VERSION = 1;

/**
 * Closed catalogue. Prompt 47 needs (classroom.manage, staff.manage,
 * report.view) are included now so Part 2 needs no redesign.
 * `classroomBound: true` = meaningful with a classroom scope.
 */
export const PERMISSIONS = {
  "school.view": { description: "View school profile and policy", classroomBound: false },
  "school.update": { description: "Edit school profile", classroomBound: false },
  "policy.manage": { description: "Change joining policy", classroomBound: false },
  "classroom.view": { description: "View classrooms", classroomBound: true },
  "classroom.manage": { description: "Create, update and delete classrooms", classroomBound: false },
  "membership.view": { description: "View memberships", classroomBound: true },
  "membership.assign": { description: "Assign and move classroom memberships", classroomBound: true },
  "membership.revoke": { description: "Remove members from the school", classroomBound: false },
  "staff.view": { description: "View staff assignments", classroomBound: false },
  "staff.manage": { description: "Assign and revoke staff", classroomBound: false },
  "roster.view": { description: "Search and list students", classroomBound: true },
  "profile.view": { description: "View student profiles", classroomBound: true },
  "report.view": { description: "View school reports and analytics", classroomBound: false },
  "pin.generate": { description: "Generate joining PINs", classroomBound: true },
  "pin.revoke": { description: "Revoke joining PINs", classroomBound: true },
  "request.review": { description: "Approve or reject joining requests", classroomBound: true },
  "invite.manage": { description: "Invite school administrators (platform only)", classroomBound: false },
  "permission.manage": { description: "Edit permission sets and scopes", classroomBound: false },
  "self.view": { description: "View own data", classroomBound: false },
};

export const PERMISSION_NAMES = Object.keys(PERMISSIONS);

/** Beta 1.9 fixed defaults, restated in canonical names. */
export const ROLE_DEFAULTS = {
  platform_admin: ["*"],
  school_admin: [
    "school.view", "school.update", "policy.manage",
    "classroom.view", "classroom.manage",
    "membership.view", "membership.assign", "membership.revoke",
    "staff.view", "staff.manage",
    "roster.view", "profile.view", "report.view",
    "pin.generate", "pin.revoke", "request.review",
    "permission.manage",
  ],
  coordinator: [
    "school.view",
    "classroom.view", "classroom.manage",
    "membership.view", "membership.assign",
    "roster.view", "profile.view", "report.view",
    "pin.generate", "pin.revoke", "request.review",
  ],
  teacher: [
    "school.view", "classroom.view", "membership.view",
    "roster.view", "profile.view",
  ],
  student: ["school.view", "classroom.view", "self.view"],
};

export function isKnownPermission(name) {
  return name === "*" || Object.hasOwn(PERMISSIONS, name);
}

/** Defaults for a role (copy). Unknown roles get []. */
export function defaultsForRole(role) {
  return [...(ROLE_DEFAULTS[role] || [])];
}

/**
 * Effective permissions: (defaults ∪ grants) − denies.
 * Unknown names in grants/denies are REJECTED by validation (never
 * silently ignored) — see validateOverrides.
 */
export function effectivePermissions(role, overrides = {}) {
  const base = defaultsForRole(role);
  if (base.includes("*")) return ["*"];
  const grants = Array.isArray(overrides.grants) ? overrides.grants : [];
  const denies = Array.isArray(overrides.denies) ? overrides.denies : [];
  const set = new Set([...base, ...grants]);
  for (const d of denies) set.delete(d);
  return [...set];
}

export function hasEffectivePermission(role, overrides, permission) {
  const eff = effectivePermissions(role, overrides);
  return eff.includes("*") || eff.includes(permission);
}

/** Throws on unknown names, non-arrays, or non-string entries. */
export function validateOverrides(overrides = {}) {
  const { grants = [], denies = [] } = overrides;
  if (!Array.isArray(grants) || !Array.isArray(denies)) {
    throw new Error("Overrides must use grants/denies arrays.");
  }
  for (const name of [...grants, ...denies]) {
    if (typeof name !== "string" || !isKnownPermission(name) || name === "*") {
      throw new Error(`Unknown permission: ${String(name)}`);
    }
  }
  return { grants: [...grants], denies: [...denies] };
}

/**
 * Access scopes: 'all' (whole school) or a list of classroom ids.
 * Normalised form: { scope: 'all' } | { scope: 'classrooms', classroomIds }.
 */
export function normaliseScopes(input) {
  if (input === undefined || input === null || input === "all") return { scope: "all", classroomIds: [] };
  if (Array.isArray(input)) {
    const ids = [...new Set(input.filter((x) => typeof x === "string" && x.trim()))].slice(0, 100);
    return { scope: "classrooms", classroomIds: ids };
  }
  if (typeof input === "object" && input.scope === "classrooms" && Array.isArray(input.classroomIds)) {
    return normaliseScopes(input.classroomIds);
  }
  throw new Error("Invalid access scopes.");
}

/**
 * Whether `staff` (resolved via resolveStaff) may act with `permission`
 * in `classroomId` (null = school-wide action).
 * - platform_admin: always.
 * - school-wide action: requires scope 'all'.
 * - classroom-bound action with classroomId: 'all' or listed.
 * - classroom-bound action WITHOUT classroomId (e.g. list across school):
 *   requires scope 'all'.
 */
export function mayAct(staff, permission, classroomId = null) {
  if (!staff) return false;
  if (staff.isPlatform) return true;
  if (!hasEffectivePermission(staff.role, staff.overrides, permission)) return false;
  const scopes = staff.scopes || { scope: "all", classroomIds: [] };
  if (classroomId) {
    if (scopes.scope === "all") return true;
    return scopes.classroomIds.includes(classroomId);
  }
  // School-wide (or unscoped-list) actions need whole-school scope.
  return scopes.scope === "all";
}
