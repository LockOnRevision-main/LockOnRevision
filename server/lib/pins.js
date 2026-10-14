/**
 * Prompt 45 — Stage 2: secure joining PINs.
 *
 * Design (see final report for full reasoning):
 * - Alphabet: 31 unambiguous chars (A-Z minus I/L/O, digits 2-9),
 *   length 8. Entropy = 8 * log2(31) ≈ 39.6 bits. With ≤10 attempts per 15-min lockout
 *   window per UID (Firestore-backed), exhaustive search is infeasible
 *   (~8.5e11 / 10 per window ≈ 1.6e8 years per PIN).
 * - Storage: HMAC-SHA256 PIN + server-side PIN_PEPPER (fail closed if
 *   unset). Only the keyed hash is stored — bulk DB disclosure reveals no
 *   redeemable PINs without the pepper. Plaintext is shown to authorised
 *   staff ONLY in the generation response, never logged or re-readable.
 * - Doc id `pin_<hashhex[0..31]>` is deterministic from the hash, so a
 *   create-transaction both enforces global uniqueness (no two active PINs
 *   collide, any scope) and gives O(1) lookup without a plaintext index.
 * - Regeneration revokes the previous PIN for the same scope.
 */
import crypto from "node:crypto";

export const PIN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 32 chars
export const PIN_LENGTH = 8;
export const PIN_ENTROPY_BITS = PIN_LENGTH * Math.log2(PIN_ALPHABET.length); // 40
export const PIN_DEFAULT_TTL_MS = 30 * 24 * 3600 * 1000;
export const PIN_MAX_TTL_MS = 90 * 24 * 3600 * 1000;

export function generatePinCode() {
  let out = "";
  for (let i = 0; i < PIN_LENGTH; i++) {
    out += PIN_ALPHABET[crypto.randomInt(PIN_ALPHABET.length)];
  }
  return out;
}

export function validatePinFormat(code) {
  if (typeof code !== "string" || code.length !== PIN_LENGTH) return false;
  return [...code].every((c) => PIN_ALPHABET.includes(c));
}

function pepper() {
  const p = process.env.PIN_PEPPER;
  if (!p || p.length < 16) {
    throw Object.assign(new Error("PIN service not configured"), { status: 500 });
  }
  return p;
}

/** Keyed hash — the ONLY form persisted. */
export function hashPin(code) {
  return crypto.createHmac("sha256", pepper()).update(code).digest("hex");
}

export function pinDocIdFromHash(hashHex) {
  return `pin_${hashHex.slice(0, 32)}`;
}

export function pinExpiryISO(ttlMs = PIN_DEFAULT_TTL_MS) {
  const ttl = Math.min(Math.max(ttlMs, 60_000), PIN_MAX_TTL_MS);
  return new Date(Date.now() + ttl).toISOString();
}

export function isPinLive(doc) {
  if (!doc || doc.status !== "active") return false;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/** Uniform failure — callers must not branch on reason. */
export function pinReject() {
  return { ok: false, error: "Invalid or expired PIN." };
}

// ---- Firestore-backed attempt limiting (shared across instances) ----
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export async function checkPinLockout(db, uid) {
  const ref = db.collection("pinAttempts").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { locked: false };
  const d = snap.data() || {};
  if (d.lockUntil && new Date(d.lockUntil).getTime() > Date.now()) {
    return { locked: true, lockUntil: d.lockUntil };
  }
  return { locked: false };
}

export async function recordPinFailure(db, uid) {
  const ref = db.collection("pinAttempts").doc(uid);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() || {} : {};
    const windowStart = d.windowStart ? new Date(d.windowStart).getTime() : 0;
    const count = now - windowStart < ATTEMPT_WINDOW_MS ? (d.count || 0) + 1 : 1;
    const patch = { count, windowStart: new Date(now - windowStart < ATTEMPT_WINDOW_MS ? windowStart : now).toISOString() };
    if (count >= ATTEMPT_LIMIT) patch.lockUntil = new Date(now + ATTEMPT_WINDOW_MS).toISOString();
    tx.set(ref, patch, { merge: true });
  });
}

export async function clearPinFailures(db, uid) {
  await db.collection("pinAttempts").doc(uid).delete().catch(() => {});
}
