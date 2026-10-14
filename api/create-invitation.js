/**
 * POST /api/create-invitation — platform-admin-only school-admin invite.
 * Body: { schoolId, email }
 * Role is fixed to 'school_admin' in this stage. Safer default: school
 * administrators CANNOT invite further admins (platform-only, parity with
 * provision-school) — inviting grants the highest school privilege, so the
 * narrowest authoriser wins. Token plaintext returned ONCE + emailed when
 * configured; copy-link fallback always returned to the platform admin.
 * Audited (id + scope only — never token or email plaintext in logs).
 */
import { generateInviteToken, hashInviteToken, inviteDocIdFromHash, inviteExpiryISO, normaliseEmail, validEmail } from "./_lib/invites.js";
import { sendInviteEmail, invitationAcceptUrl } from "./_lib/email.js";
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin, auditRef, auditData } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "create-invitation", 10)) return;

  const { schoolId, email } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  if (!validEmail(email)) return res.status(400).json({ error: "Invalid email." });

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    const school = await db.collection("schools").doc(schoolId).get();
    if (!school.exists) return res.status(404).json({ error: "School not found." });
    if ((school.data() || {}).type === "academy") {
      return res.status(400).json({ error: "Academy uses migration enrolment, not invitations." });
    }

    const emailLower = normaliseEmail(email);
    let token, hash, invId;
    for (let attempt = 0; attempt < 5; attempt++) {
      token = generateInviteToken();
      try {
        hash = hashInviteToken(token);
      } catch {
        return res.status(500).json({ error: "Invitation service not configured." });
      }
      invId = inviteDocIdFromHash(hash);
      if (!(await db.collection("adminInvitations").doc(invId).get()).exists) break;
      invId = null;
    }
    if (!invId) return res.status(500).json({ error: "Could not create invitation. Retry." });

    const now = new Date().toISOString();
    // Stage 0.3: invitation + audit commit atomically (email stays
    // best-effort outside — external provider, not Firestore).
    const batch = db.batch();
    batch.create(db.collection("adminInvitations").doc(invId), {
      schoolId, emailLower, role: "school_admin",
      tokenHash: hash, status: "pending", expiresAt: inviteExpiryISO(),
      createdBy: user.uid, createdAt: now, resendCount: 0,
      usedAt: null, usedBy: null, revokedAt: null, revokedBy: null,
    });
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "invite.create", targetUid: null,
      schoolId, scope: `invitation:${invId}`,
    }));
    await batch.commit();

    const acceptUrl = invitationAcceptUrl(token);
    let emailed = { sent: false, reason: "email-not-configured" };
    if (acceptUrl) {
      emailed = await sendInviteEmail({ to: emailLower, schoolName: (school.data() || {}).name || schoolId, acceptUrl });
    }
    // Plaintext ONCE. No email/token in logs.
    return res.status(200).json({
      ok: true, invitationId: invId, token, acceptUrl,
      emailed: emailed.sent, emailFallback: !emailed.sent,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Invitation failed." });
  }
}
