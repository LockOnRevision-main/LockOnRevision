/**
 * Beta 1.9 Prompt 44 — Stage C: centralised authorisation helpers (Vercel API routes).
 *
 * Enforcement choice (see final report): Firestore membership documents
 * consulted per-request via the Admin SDK, NOT Firebase custom claims.
 * Reasons:
 *  - Spark plan cannot deploy Cloud Functions that set claims; Vercel routes
 *    with the Admin SDK can read Firestore on Spark without a Blaze upgrade.
 *  - Membership docs take effect immediately (no 1h token-claim staleness,
 *    no 1000-byte claim-size pressure for multi-school students).
 *  - Revocation = status change on the membership doc; next request denies.
 *
 * All API routes must use requirePlatformAdmin() / requireSchoolRole()
 * instead of ad-hoc checks.
 */

import { verifyAuth } from "./auth.js";

let adminDb = null;
async function getAdminDb() {
  if (adminDb) return adminDb;
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin SDK not configured (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)");
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  adminDb = getFirestore();
  return adminDb;
}

/** Fixed default permission sets per role (Beta 1.9), now sourced from the
 * shared catalogue (Beta 2.0 Stage 2) — same single source as enforcement
 * and UI gating. Legacy dotted names map to canonical ones (see below). */
import { ROLE_DEFAULTS as CATALOGUE_DEFAULTS } from "../../shared/permissionsCatalogue.js";
export const ROLE_PERMISSIONS = CATALOGUE_DEFAULTS;

/** Legacy Beta 1.9 dotted names → canonical catalogue names. */
export const LEGACY_PERMISSION_MAP = {
  "school.read": "school.view",
  "school.update": "school.update",
  "classroom.create": "classroom.manage",
  "classroom.read": "classroom.view",
  "classroom.update": "classroom.manage",
  "classroom.delete": "classroom.manage",
  "membership.read": "membership.view",
  "membership.create": "membership.assign",
  "membership.update": "membership.assign",
  "membership.revoke": "membership.revoke",
  "staff.read": "staff.view",
  "staff.assign": "staff.manage",
  "staff.revoke": "staff.manage",
  "student.read": "roster.view",
  "analytics.read": "report.view",
  "self.read": "self.view",
};

/** Shape kept extensible for Beta 2.0 configurable permissions (no UI yet). */
export function permissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

export function hasPermission(role, permission) {
  const canonical = LEGACY_PERMISSION_MAP[permission] || permission;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(canonical);
}

async function isPlatformAdminDoc(db, uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  return d.isAdmin === true || d.role === "admin";
}

async function activeMemberships(db, uid, schoolId = null) {
  let q = db.collection("memberships").where("uid", "==", uid).where("status", "==", "active");
  if (schoolId) q = q.where("schoolId", "==", schoolId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Verify bearer + platform admin. Throws 401/403-coded errors. */
export async function requirePlatformAdmin(req) {
  const user = await verifyAuth(req);
  const db = await getAdminDb();
  const ok = await isPlatformAdminDoc(db, user.uid);
  if (!ok) {
    const err = new Error("Admin access required.");
    err.status = 403;
    throw err;
  }
  return user;
}

/**
 * Verify bearer + (platform admin OR active school role in `schoolId`).
 * allowedRoles e.g. ['school_admin','coordinator','teacher'].
 * Platform admins always pass (may oversee external schools).
 */
export async function requireSchoolRole(req, schoolId, allowedRoles) {
  if (!schoolId) {
    const err = new Error("Missing schoolId.");
    err.status = 400;
    throw err;
  }
  const user = await verifyAuth(req);
  const db = await getAdminDb();
  if (await isPlatformAdminDoc(db, user.uid)) return { user, role: "platform_admin", via: "platform" };
  const memberships = await activeMemberships(db, user.uid, schoolId);
  const match = memberships.find((m) => allowedRoles.includes(m.role));
  if (!match) {
    const err = new Error("Insufficient school permission.");
    err.status = 403;
    throw err;
  }
  if (!hasPermission(match.role, `${match.role === "teacher" ? "classroom.read" : "school.read"}`)) {
    const err = new Error("Role has no permission for this action.");
    err.status = 403;
    throw err;
  }
  return { user, role: match.role, via: "membership", membership: match };
}

/** Revocation helper: deactivate membership; caller should also revoke refresh tokens. */
export async function revokeMembership(schoolId, uid, actorUid) {
  const db = await getAdminDb();
  const id = `${uid}_${schoolId}`;
  const ref = db.collection("memberships").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("Membership not found.");
    err.status = 404;
    throw err;
  }
  await ref.update({ status: "removed", removedAt: new Date().toISOString(), removedBy: actorUid });
  // Best-effort refresh-token revocation (immediate client invalidation).
  try {
    const { getAuth } = await import("firebase-admin/auth");
    await getAuth().revokeRefreshTokens(uid);
  } catch {
    // Documented limitation: if Admin Auth unavailable, Firestore denial still
    // applies on the next request; ID-token claims (if any) expire ≤1h.
  }
  await db.collection("adminAuditLogs").add({
    actorUid, action: "membership.revoke", targetUid: uid, schoolId,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, id };
}
