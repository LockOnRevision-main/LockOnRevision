/**
 * Beta 2.0 Part 1 — Stage 1: invitation tokens.
 *
 * Design (see final report):
 * - Token: 32 cryptographically random bytes, base64url (43 chars,
 *   256-bit entropy). Guessing is infeasible even without rate limits;
 *   rate limits + single-use + 7-day expiry are defence in depth.
 * - Storage: HMAC-SHA256 + INVITE_PEPPER (server secret, fail closed if
 *   unset/short). Only the keyed hash persists — bulk disclosure reveals
 *   nothing redeemable. Plaintext appears ONLY in the creation/resend
 *   response (once) and the emailed link; never logged, never re-readable.
 * - Doc id `inv_<hash[0..31]>` is deterministic: O(1) lookup by token,
 *   global uniqueness, no plaintext index.
 * - Binding: schoolId + role (fixed 'school_admin' in this stage) +
 *   invited email (lowercased). Acceptance requires the signed-in user's
 *   VERIFIED email to match (`email_verified` ID-token claim), else reject.
 *   Unverified accounts cannot accept — prevents address squatting.
 */
import crypto from "node:crypto";

export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;
export const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken() {
  return crypto.randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

function pepper() {
  const p = process.env.INVITE_PEPPER;
  if (!p || p.length < 16) {
    throw Object.assign(new Error("Invitation service not configured"), { status: 500 });
  }
  return p;
}

export function hashInviteToken(token) {
  return crypto.createHmac("sha256", pepper()).update(token).digest("hex");
}

export function inviteDocIdFromHash(hashHex) {
  return `inv_${hashHex.slice(0, 32)}`;
}

export function inviteExpiryISO() {
  return new Date(Date.now() + INVITE_TTL_MS).toISOString();
}

export function isInviteLive(doc) {
  if (!doc || doc.status !== "pending") return false;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/** Uniform failure for unknown/expired/revoked/used tokens. */
export function inviteReject() {
  return { ok: false, error: "Invalid or expired invitation." };
}

export function normaliseEmail(email) {
  return String(email || "").trim().toLowerCase().slice(0, 320);
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(email));
}

// ---- Firestore-backed attempt limiting (shared across instances) ----
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export async function checkInviteLockout(db, uid) {
  const ref = db.collection("inviteAttempts").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { locked: false };
  const d = snap.data() || {};
  if (d.lockUntil && new Date(d.lockUntil).getTime() > Date.now()) {
    return { locked: true, lockUntil: d.lockUntil };
  }
  return { locked: false };
}

export async function recordInviteFailure(db, uid) {
  const ref = db.collection("inviteAttempts").doc(uid);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() || {} : {};
    const windowStart = d.windowStart ? new Date(d.windowStart).getTime() : 0;
    const inWindow = now - windowStart < ATTEMPT_WINDOW_MS;
    const count = inWindow ? (d.count || 0) + 1 : 1;
    const patch = { count, windowStart: new Date(inWindow ? windowStart : now).toISOString() };
    if (count >= ATTEMPT_LIMIT) patch.lockUntil = new Date(now + ATTEMPT_WINDOW_MS).toISOString();
    tx.set(ref, patch, { merge: true });
  });
}

export async function clearInviteFailures(db, uid) {
  await db.collection("inviteAttempts").doc(uid).delete().catch(() => {});
}
