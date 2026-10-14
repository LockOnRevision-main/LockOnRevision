/**
 * Shared server-side school helpers (Prompts 45 + 46). All routes use these —
 * no parallel authorisation logic. Admin SDK bypasses Firestore rules;
 * every function below re-checks authorisation explicitly.
 * Beta 2.0 Stage 2: single resolution core (resolveStaff) feeds both the
 * legacy role gate (requireSchoolStaff) and per-permission checks
 * (requirePermission) — one source, no drift.
 */
import { verifyAuth } from "./auth.js";
import { rateLimit, rateLimitKey } from "./validation.js";
import {
  mayAct, normaliseScopes,
} from "../../shared/permissionsCatalogue.js";

let adminDb = null;
export async function getAdminDb() {
  if (adminDb) return adminDb;
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) throw new Error("Server not configured");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  adminDb = getFirestore();
  return adminDb;
}

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export async function authedUser(req, res) {
  try {
    const user = await verifyAuth(req);
    req.user = user;
    return user;
  } catch (e) {
    res.status(401).json({ error: e.message });
    return null;
  }
}

export function checkRate(req, res, scope, max = 20, windowMs = 60_000) {
  const rl = rateLimit(rateLimitKey(req, scope), { max, windowMs });
  if (!rl.allowed) {
    res.status(429).json({ error: "Too many requests. Try again later." });
    return false;
  }
  return true;
}

export async function isPlatformAdmin(db, uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  return d.isAdmin === true || d.role === "admin";
}

export async function activeMembership(db, uid, schoolId) {
  const snap = await db.collection("memberships").doc(`${uid}_${schoolId}`).get();
  if (!snap.exists) return null;
  const d = snap.data();
  return d && d.status === "active" ? d : null;
}

/**
 * Single resolution core. Returns null (no access) or:
 *  { isPlatform:true, role:'platform_admin' } |
 *  { role, overrides:{grants,denies}, scopes:{scope,classroomIds}, via:'membership' }
 * Overrides live on the MEMBERSHIP doc (deterministic get, no index);
 * staffAssignments remains the assignment ledger. Absent overrides ==
 * Beta 1.9 fixed defaults (backwards compatible).
 */
export async function resolveStaff(db, uid, schoolId) {
  if (await isPlatformAdmin(db, uid)) return { isPlatform: true, role: "platform_admin", via: "platform" };
  const m = await activeMembership(db, uid, schoolId);
  if (!m) return null;
  if (!["school_admin", "coordinator", "teacher"].includes(m.role)) return null;
  return {
    role: m.role,
    overrides: {
      grants: Array.isArray(m.permissionSet?.grants) ? m.permissionSet.grants : [],
      denies: Array.isArray(m.permissionSet?.denies) ? m.permissionSet.denies : [],
    },
    scopes: normaliseScopes(m.accessScopes ?? "all"),
    via: "membership",
  };
}

/**
 * Authorise staff for a school. allowedRoles e.g. ['school_admin'].
 * Platform admins always pass. Returns staff or sends 403 + null.
 */
export async function requireSchoolStaff(db, req, res, schoolId, allowedRoles) {
  const staff = await resolveStaff(db, req.user.uid, schoolId);
  if (staff && (staff.isPlatform || allowedRoles.includes(staff.role))) return staff;
  res.status(403).json({ error: "Insufficient school permission." });
  return null;
}

/**
 * Per-permission gate (Stage 2). Checks the specific catalogue permission
 * AND classroom scope on the server. Returns staff or sends 403 + null.
 * classroomId null = school-wide action (needs whole-school scope).
 */
export async function requirePermission(db, req, res, schoolId, permission, classroomId = null) {
  const staff = await resolveStaff(db, req.user.uid, schoolId);
  if (staff && mayAct(staff, permission, classroomId)) return staff;
  res.status(403).json({ error: "Insufficient school permission." });
  return null;
}

export async function audit(db, entry) {
  await db.collection("adminAuditLogs").add({
    createdAt: new Date().toISOString(),
    ...entry,
  });
}

/**
 * Stage 0.3: atomic audit. Creates the audit doc ref ONCE (outside the
 * transaction function) so transaction retries reuse the same id and can
 * never duplicate the entry. Use inside runTransaction via tx.set, or in a
 * WriteBatch via batch.set — the audit entry commits atomically WITH the
 * data change, so a crash cannot leave one without the other.
 */
export function auditRef(db) {
  return db.collection("adminAuditLogs").doc();
}

export function auditData(entry) {
  return { createdAt: new Date().toISOString(), ...entry };
}

export function membershipId(uid, schoolId) {
  const s = (x) => String(x).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  return `${s(uid)}_${s(schoolId)}`;
}
