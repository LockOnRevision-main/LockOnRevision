/**
 * POST /api/accept-invitation — invited school-admin acceptance.
 * Body: { token }
 * Uniform responses for unknown/expired/revoked/used AND mismatched
 * tokens: { ok:false, error:"Invalid or expired invitation." } — valid
 * tokens cannot be discovered by response differences, even by link
 * holders probing other tokens.
 * Binding: the signed-in user's VERIFIED email (ID-token `email_verified`
 * claim) must equal the invitation's email (lowercased). Unverified
 * accounts cannot accept (prevents address squatting). No-account case:
 * the invitation email instructs registering with the exact address and
 * verifying first — the endpoint itself reveals nothing beyond the
 * uniform rejection.
 * Atomicity: mark-used + membership + staff assignment in ONE transaction
 * (single-use holds under concurrency). Rate-limited (existing layers).
 */
import { hashInviteToken, inviteDocIdFromHash, isInviteLive, inviteReject, checkInviteLockout, recordInviteFailure, clearInviteFailures, normaliseEmail } from "./_lib/invites.js";
import { getAdminDb, cors, authedUser, checkRate, auditRef, auditData, membershipId } from "./_lib/schoolServer.js";
import { rateLimit, rateLimitKey } from "./_lib/validation.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "accept-invitation-uid", 10, 10 * 60 * 1000)) return;
  const ipRl = rateLimit(`accept-invitation-ip:${rateLimitKey(req, "x").split(":").pop()}`, { max: 30, windowMs: 10 * 60 * 1000 });
  if (!ipRl.allowed) return res.status(429).json({ error: "Too many attempts. Try again later." });

  const { token } = req.body || {};
  if (typeof token !== "string" || token.length < 20 || token.length > 100) {
    return res.status(200).json(inviteReject());
  }

  try {
    const db = await getAdminDb();
    const lock = await checkInviteLockout(db, user.uid);
    if (lock.locked) return res.status(429).json({ error: "Too many attempts. Try again later." });

    let hash;
    try {
      hash = hashInviteToken(token);
    } catch {
      return res.status(500).json({ error: "Invitations are temporarily unavailable." });
    }

    const fail = async () => {
      await recordInviteFailure(db, user.uid).catch(() => {});
      return res.status(200).json(inviteReject());
    };

    const invId = inviteDocIdFromHash(hash);
    const invSnap = await db.collection("adminInvitations").doc(invId).get();
    if (!invSnap.exists) return fail();
    const inv = invSnap.data() || {};
    if (!isInviteLive(inv)) return fail();
    if (inv.schoolId === "academy") return fail();

    // Email binding (post-liveness; failures stay uniform — no oracle).
    const callerEmail = normaliseEmail(user.email);
    const verified = user.email_verified === true;
    if (!verified || callerEmail !== (inv.emailLower || "")) return fail();

    const now = new Date().toISOString();
    const memId = membershipId(user.uid, inv.schoolId);
    const acceptAudit = auditRef(db); // outside tx: retry-safe
    const outcome = await db.runTransaction(async (tx) => {
      const cur = await tx.get(db.collection("adminInvitations").doc(invId));
      const cd = cur.data() || {};
      if (cd.status !== "pending" || (cd.expiresAt && new Date(cd.expiresAt).getTime() < Date.now())) {
        throw Object.assign(new Error("STALE"), { status: 409 });
      }
      const memRef = db.collection("memberships").doc(memId);
      const mem = await tx.get(memRef);
      if (mem.exists && (mem.data() || {}).status === "active" && (mem.data() || {}).role === "school_admin") {
        tx.update(db.collection("adminInvitations").doc(invId), { status: "used", usedAt: now, usedBy: user.uid });
        tx.set(acceptAudit, auditData({
          actorUid: user.uid, action: "invite.accept", targetUid: user.uid,
          schoolId: inv.schoolId, scope: `invitation:${invId}`,
        }));
        return { already: true };
      }
      tx.update(db.collection("adminInvitations").doc(invId), { status: "used", usedAt: now, usedBy: user.uid });
      tx.set(memRef, {
        uid: user.uid, schoolId: inv.schoolId, role: "school_admin", classroomId: null,
        status: "active", createdAt: mem.exists ? (mem.data() || {}).createdAt || now : now,
        updatedAt: now, removedAt: null, removedBy: null,
      }, { merge: true });
      tx.set(db.collection("staffAssignments").doc(`${memId}_school_admin`), {
        uid: user.uid, schoolId: inv.schoolId, classroomId: null, role: "school_admin",
        status: "active", createdAt: now, updatedAt: now,
      }, { merge: true });
      tx.set(acceptAudit, auditData({
        actorUid: user.uid, action: "invite.accept", targetUid: user.uid,
        schoolId: inv.schoolId, scope: `invitation:${invId}`,
      }));
      return { already: false };
    }).catch((e) => {
      if (e.message === "STALE" || e.status === 409) return "STALE";
      throw e;
    });
    if (outcome === "STALE") return fail();

    await clearInviteFailures(db, user.uid);
    return res.status(200).json({ ok: true, schoolId: inv.schoolId, already: outcome.already });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Acceptance failed." });
  }
}
