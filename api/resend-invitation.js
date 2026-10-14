/**
 * POST /api/resend-invitation — platform-only. Invalidates the previous
 * token (status revoked) and issues a fresh one (new hash-derived doc).
 * Audited (invite.revoke + invite.create). Plaintext of the NEW token
 * returned once; old token never works again.
 */
import { generateInviteToken, hashInviteToken, inviteDocIdFromHash, inviteExpiryISO } from "./_lib/invites.js";
import { sendInviteEmail, invitationAcceptUrl } from "./_lib/email.js";
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin, audit } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "resend-invitation", 10)) return;

  const { invitationId } = req.body || {};
  if (typeof invitationId !== "string" || !invitationId.trim()) {
    return res.status(400).json({ error: "Invalid invitationId." });
  }

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    const oldRef = db.collection("adminInvitations").doc(invitationId);
    const old = await oldRef.get();
    if (!old.exists) return res.status(404).json({ error: "Invitation not found." });
    const od = old.data() || {};
    if (od.status === "used") return res.status(409).json({ error: "Invitation already used." });

    let token, hash, newId;
    for (let attempt = 0; attempt < 5; attempt++) {
      token = generateInviteToken();
      try {
        hash = hashInviteToken(token);
      } catch {
        return res.status(500).json({ error: "Invitation service not configured." });
      }
      newId = inviteDocIdFromHash(hash);
      if (newId !== invitationId && !(await db.collection("adminInvitations").doc(newId).get()).exists) break;
      newId = null;
    }
    if (!newId) return res.status(500).json({ error: "Could not reissue. Retry." });

    const now = new Date().toISOString();
    await oldRef.update({ status: "revoked", revokedAt: now, revokedBy: user.uid });
    await db.collection("adminInvitations").doc(newId).create({
      schoolId: od.schoolId, emailLower: od.emailLower, role: od.role || "school_admin",
      tokenHash: hash, status: "pending", expiresAt: inviteExpiryISO(),
      createdBy: user.uid, createdAt: now, resendCount: (od.resendCount || 0) + 1,
      usedAt: null, usedBy: null, revokedAt: null, revokedBy: null,
      resends: invitationId,
    });

    const school = await db.collection("schools").doc(od.schoolId).get();
    const acceptUrl = invitationAcceptUrl(token);
    let emailed = { sent: false, reason: "email-not-configured" };
    if (acceptUrl) {
      emailed = await sendInviteEmail({ to: od.emailLower, schoolName: (school.data() || {}).name || od.schoolId, acceptUrl });
    }
    await audit(db, { actorUid: user.uid, action: "invite.revoke", targetUid: null, schoolId: od.schoolId, scope: `invitation:${invitationId}` });
    await audit(db, { actorUid: user.uid, action: "invite.create", targetUid: null, schoolId: od.schoolId, scope: `invitation:${newId}` });
    return res.status(200).json({ ok: true, invitationId: newId, token, acceptUrl, emailed: emailed.sent });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Resend failed." });
  }
}
