/**
 * POST /api/redeem-pin — verified-student PIN redemption.
 * Body: { code }
 * Responses are UNIFORM for unknown/expired/revoked/wrong-scope PINs:
 *   { ok: false, error: "Invalid or expired PIN." }
 * so valid PINs cannot be discovered by response differences.
 * Outcome depends on the school's joinPolicy (default APPROVAL_REQUIRED):
 * - IMMEDIATE: active membership (deterministic id), classroom enrolment
 *   when a classroom PIN was used.
 * - APPROVAL_REQUIRED: pending joinRequest, no access granted, duplicates
 *   prevented by deterministic request id.
 * Academy ('academy') is never joinable via PINs.
 */
import { validatePinFormat, hashPin, pinDocIdFromHash, isPinLive, pinReject, checkPinLockout, recordPinFailure, clearPinFailures } from "./_lib/pins.js";
import { getAdminDb, cors, authedUser, checkRate, audit, membershipId } from "./_lib/schoolServer.js";
import { rateLimit, rateLimitKey } from "./_lib/validation.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "redeem-pin-uid", 10, 10 * 60 * 1000)) return;
  const ipRl = rateLimit(`redeem-pin-ip:${rateLimitKey(req, "x").split(":").pop()}`, { max: 30, windowMs: 10 * 60 * 1000 });
  if (!ipRl.allowed) return res.status(429).json({ error: "Too many attempts. Try again later." });

  const { code } = req.body || {};
  if (!validatePinFormat(code)) {
    try {
      const db = await getAdminDb();
      await recordPinFailure(db, user.uid);
    } catch { /* best-effort: never fail the request on telemetry cleanup */ }
    return res.status(200).json(pinReject());
  }

  try {
    const db = await getAdminDb();
    const lock = await checkPinLockout(db, user.uid);
    if (lock.locked) return res.status(429).json({ error: "Too many attempts. Try again later." });

    let hash;
    try {
      hash = hashPin(code);
    } catch {
      return res.status(500).json({ error: "Joining is temporarily unavailable." });
    }

    const fail = async () => {
      await recordPinFailure(db, user.uid).catch(() => {});
      return res.status(200).json(pinReject());
    };

    const pinSnap = await db.collection("joiningPins").doc(pinDocIdFromHash(hash)).get();
    if (!pinSnap.exists) return fail();
    const pin = pinSnap.data() || {};
    if (!isPinLive(pin)) return fail();
    // Scope re-validated server-side (never trusted from client).
    if (pin.classroomId) {
      const cls = await db.collection("classrooms").doc(pin.classroomId).get();
      if (!cls.exists || (cls.data() || {}).schoolId !== pin.schoolId) return fail();
    }
    if (pin.schoolId === "academy") return fail(); // Academy excluded from PIN flow

    const schoolSnap = await db.collection("schools").doc(pin.schoolId).get();
    if (!schoolSnap.exists) return fail();
    const policy = (schoolSnap.data() || {}).joinPolicy === "IMMEDIATE" ? "IMMEDIATE" : "APPROVAL_REQUIRED";
    const now = new Date().toISOString();

    // Already a member? (includes previously-removed rejoin below)
    const memRef = db.collection("memberships").doc(membershipId(user.uid, pin.schoolId));
    const memSnap = await memRef.get();
    if (memSnap.exists && (memSnap.data() || {}).status === "active") {
      await clearPinFailures(db, user.uid);
      return res.status(200).json({ ok: true, already: true, policy });
    }

    if (policy === "IMMEDIATE") {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(memRef);
        if (fresh.exists && (fresh.data() || {}).status === "active") return; // concurrent win
        tx.set(memRef, {
          uid: user.uid, schoolId: pin.schoolId, role: "student",
          classroomId: pin.classroomId || (fresh.exists ? (fresh.data() || {}).classroomId || null : null),
          status: "active", createdAt: fresh.exists ? (fresh.data() || {}).createdAt || now : now,
          updatedAt: now, removedAt: null, removedBy: null,
        }, { merge: true });
        tx.update(db.collection("joiningPins").doc(pinSnap.id), { useCount: (pin.useCount || 0) + 1 });
      });
      await clearPinFailures(db, user.uid);
      await audit(db, {
        actorUid: user.uid, action: "membership.create", targetUid: user.uid,
        schoolId: pin.schoolId, scope: pin.classroomId ? `classroom:${pin.classroomId}` : "school",
      });
      return res.status(200).json({ ok: true, joined: true, schoolId: pin.schoolId, classroomId: pin.classroomId || null });
    }

    // APPROVAL_REQUIRED: pending request, no access, duplicate-proof id.
    const reqId = `req_${user.uid}_${pin.schoolId}_${pin.classroomId || "school"}`.replace(/[^A-Za-z0-9_:-]/g, "_").slice(0, 200);
    const reqRef = db.collection("joinRequests").doc(reqId);
    const existing = await reqRef.get();
    if (existing.exists && (existing.data() || {}).status === "pending") {
      await clearPinFailures(db, user.uid);
      return res.status(200).json({ ok: true, pending: true, alreadyRequested: true });
    }
    // PIN revoked between policy read and now? Re-check liveness in tx below via read.
    await db.runTransaction(async (tx) => {
      const livePin = await tx.get(db.collection("joiningPins").doc(pinSnap.id));
      const ld = livePin.data() || {};
      if (ld.status !== "active" || (ld.expiresAt && new Date(ld.expiresAt).getTime() < Date.now())) {
        throw Object.assign(new Error("STALE_PIN"), { status: 409 });
      }
      const cur = await tx.get(reqRef);
      if (cur.exists && (cur.data() || {}).status === "pending") return;
      tx.set(reqRef, {
        uid: user.uid, schoolId: pin.schoolId, classroomId: pin.classroomId || null,
        status: "pending", pinId: pinSnap.id, createdAt: now, decidedBy: null, decidedAt: null,
      }, { merge: true });
    }).catch((e) => {
      if (e.message === "STALE_PIN") throw e;
      throw e;
    });
    await clearPinFailures(db, user.uid);
    await audit(db, {
      actorUid: user.uid, action: "join-request.create", targetUid: user.uid,
      schoolId: pin.schoolId, scope: pin.classroomId ? `classroom:${pin.classroomId}` : "school",
    });
    return res.status(200).json({ ok: true, pending: true });
  } catch (e) {
    if (e.message === "STALE_PIN") {
      try {
        const db = await getAdminDb();
        await recordPinFailure(db, req.user.uid);
      } catch { /* best-effort: never fail the request on telemetry cleanup */ }
      return res.status(200).json(pinReject());
    }
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Redemption failed." });
  }
}
