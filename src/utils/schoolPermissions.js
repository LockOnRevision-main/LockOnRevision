/**
 * Beta 2.0 Part 1 — Stage 2: frontend permission mirror.
 * DERIVES from shared/permissionsCatalogue.js (single source) — backend
 * (`server/lib/schoolServer.js`) enforces from the same file, so UI gating
 * and enforcement cannot drift. UI gating is convenience only.
 */
export {
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
  isKnownPermission,
} from "../../shared/permissionsCatalogue.js";

import {
  ROLE_DEFAULTS,
  effectivePermissions,
} from "../../shared/permissionsCatalogue.js";

export const SCHOOL_ROLES = ["school_admin", "coordinator", "teacher", "student"];

/** Backwards-compatible alias: fixed defaults per role (Beta 1.9 shape). */
export const ROLE_PERMISSIONS = ROLE_DEFAULTS;

/** Backwards-compatible alias. */
export function permissionsForRole(role) {
  return [...(ROLE_DEFAULTS[role] || [])];
}

/**
 * UI gating helper. Prefer effective-permission checks with overrides +
 * scopes (mayAct) where the staff record is available.
 */
export function hasSchoolPermission(role, permission, overrides) {
  const eff = effectivePermissions(role, overrides);
  return eff.includes("*") || eff.includes(permission);
}
