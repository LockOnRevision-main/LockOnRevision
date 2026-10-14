/**
 * POST /api/assign-staff — school-scoped staff assignment (Prompt 50).
 * Body: { uid, schoolId, role: 'coordinator' | 'teacher', classroomId? }
 *
 * Assigns an EXISTING verified user to the caller's school. Only
 * coordinator/teacher may be granted here — school_admin assignment stays
 * platform-only (provision-school / invitations), so school admins can
 * never escalate anyone (including themselves) to school-wide control or
 * platform privileges through this route.
 *
 * Guardrails:
 *  - staff.manage on the TARGET school (whole-school scope), server-checked.
 *  - Target identity verified via Auth (no email flows, no invented users).
 *  - classroomId, when given, must exist AND belong to schoolId.
 *  - Membership + ledger via shared writeStaffRecords; audit atomically.
 *  - Never touches users/{uid} or any learning subcollections.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission, auditRef, auditData, membershipId, writeStaffRecords } from "../lib/schoolServer.js";

const ASSIGNABLE_ROLES = ["coordinator", "teacher"];

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "assign-staff", 20)) return;

  const { uid, schoolId, role, classroomId = null } = req.body || {};
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role. Assignable roles: coordinator, teacher." });
  }
  if (uid === user.uid) return res.status(400).json({ error: "You cannot assign yourself via this route." });
  if (classroomId !== null && (typeof classroomId !== "string" || !classroomId.trim())) {
    return res.status(400).json({ error: "Invalid classroomId." });
  }

  try {
    const db = await getAdminDb();
    // Whole-school action: classroom-scoped staff cannot assign.
    const staff = await requirePermission(db, req, res, schoolId, "staff.manage");
    if (!staff) return;
    if (!(await db.collection("schools").doc(schoolId).get()).exists) {
      return res.status(404).json({ error: "School not found." });
    }
    // Existing, verified user (by UID) — throws if unknown.
    const { getAuth } = await import("firebase-admin/auth");
    await getAuth().getUser(uid);

    if (classroomId) {
      const cls = await db.collection("classrooms").doc(classroomId).get();
      if (!cls.exists || (cls.data() || {}).schoolId !== schoolId) {
        return res.status(400).json({ error: "Classroom does not belong to this school." });
      }
    }

    const now = new Date().toISOString();
    const batch = db.batch();
    await writeStaffRecords(db, batch, {
      uid, schoolId, role, status: "active",
      classroomId: classroomId || null, now,
    });
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "staff.assign", targetUid: uid,
      schoolId, scope: `role:${role}`,
    }));
    await batch.commit();
    // Keep the deterministic id visible for debugging (no PII beyond uid).
    return res.status(200).json({ ok: true, membershipId: membershipId(uid, schoolId), role });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Assignment failed." });
  }
}
