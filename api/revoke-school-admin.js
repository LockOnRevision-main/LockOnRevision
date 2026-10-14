/**
 * POST /api/revoke-school-admin — platform-admin-only removal/reassignment.
 * Body: { schoolId, uid, acknowledgeEmpty? }
 * Refuses to leave a school with zero active school_admins unless
 * acknowledgeEmpty === true (explicit, audited). Prompt revocation effect:
 * membership status flip denies on the NEXT request (rules read the doc),
 * plus refresh-token revocation best-effort. Audited.
 */
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin, auditRef, auditData, membershipId } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "revoke-school-admin", 10)) return;

  const { schoolId, uid, acknowledgeEmpty = false } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    const ref = db.collection("memberships").doc(membershipId(uid, schoolId));
    const snap = await ref.get();
    if (!snap.exists || (snap.data() || {}).status !== "active") {
      return res.status(404).json({ error: "Active assignment not found." });
    }
    if (!["school_admin", "coordinator", "teacher"].includes((snap.data() || {}).role)) {
      return res.status(400).json({ error: "Not a staff assignment." });
    }

    // Last-admin guard.
    if ((snap.data() || {}).role === "school_admin") {
      const roster = await db.collection("memberships")
        .where("schoolId", "==", schoolId).where("status", "==", "active").get();
      const admins = roster.docs.filter((d) => (d.data() || {}).role === "school_admin" && d.data().uid !== uid);
      if (admins.length === 0 && acknowledgeEmpty !== true) {
        return res.status(409).json({ error: "Last school administrator. Reassign first or set acknowledgeEmpty:true." });
      }
    }

    const now = new Date().toISOString();
    // Stage 0.3: status flip + audit commit atomically (token revocation
    // stays best-effort outside the batch — Auth, not Firestore).
    const batch = db.batch();
    batch.update(ref, { status: "removed", removedAt: now, removedBy: user.uid });
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "staff.revoke", targetUid: uid,
      schoolId, scope: `role:${(snap.data() || {}).role}`,
    }));
    await batch.commit();
    try {
      const { getAuth } = await import("firebase-admin/auth");
      await getAuth().revokeRefreshTokens(uid);
    } catch { /* best-effort token revocation; rule denial still applies */ }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Revocation failed." });
  }
}
