/**
 * POST /api/set-school-admin — platform-admin-only assignment of an
 * existing verified user as school_admin of an EXISTING school.
 * Body: { schoolId, uid }
 *
 * Guardrails:
 *  - Caller must be a platform admin (isAdmin === true via users doc).
 *  - Target school must exist.
 *  - Target user must exist in Firebase Auth (canonical UID, verified).
 *  - Role is strictly school_admin (scoped to schoolId) — never sets
 *    isAdmin / platform-admin status.
 *  - Membership + staffAssignments ledger via shared writeStaffRecords;
 *    audit committed atomically in the same batch.
 *  - Idempotent: re-assigning an already-active school_admin is a no-op ok.
 *  - Preserves the user's memberships in other schools (deterministic
 *    doc id ${uid}_${schoolId}, merge:true).
 */
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin, auditRef, auditData, membershipId, writeStaffRecords } from "../lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "set-school-admin", 10)) return;

  const { schoolId, uid } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    if (!(await db.collection("schools").doc(schoolId).get()).exists) {
      return res.status(404).json({ error: "School not found." });
    }
    // Existing, verified user (canonical Firebase UID) — throws if unknown.
    const { getAuth } = await import("firebase-admin/auth");
    await getAuth().getUser(uid);

    const ref = db.collection("memberships").doc(membershipId(uid, schoolId));
    const snap = await ref.get();
    const d = snap.exists ? snap.data() || {} : null;
    if (d && d.status === "active" && d.role === "school_admin") {
      // Idempotent: already the school admin of this school.
      return res.status(200).json({ ok: true, already: true, membershipId: membershipId(uid, schoolId), role: "school_admin" });
    }

    const now = new Date().toISOString();
    const batch = db.batch();
    await writeStaffRecords(db, batch, {
      uid, schoolId, role: "school_admin", status: "active",
      classroomId: null, now,
    });
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "staff.assign", targetUid: uid,
      schoolId, scope: "role:school_admin",
    }));
    await batch.commit();
    return res.status(200).json({ ok: true, already: false, membershipId: membershipId(uid, schoolId), role: "school_admin" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Assignment failed." });
  }
}
