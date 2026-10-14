/**
 * POST /api/manage-membership — scoped classroom/school membership changes.
 * Body: { action, uid, schoolId, classroomId? }
 * Actions:
 *  - assign-classroom: school_admin/coordinator; sets classroomId (same school).
 *  - move-classroom:   school_admin/coordinator; alias with from-check.
 *  - remove-classroom: school_admin/coordinator; clears classroomId only.
 *  - remove-school:    school_admin ONLY; status='removed' + timestamps.
 * Removal revokes access WITHOUT deleting users/{uid} or any learning
 * subcollections (XP/Energy/Forge/timetables/analytics untouched).
 * All actions audited. Never touches Academy memberships via this route
 * unless schoolId==='academy' with proper admin (same safety applies).
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission, audit, membershipId } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "manage-membership", 30)) return;

  const { action, uid, schoolId, classroomId = null } = req.body || {};
  const ACTIONS = ["assign-classroom", "move-classroom", "remove-classroom", "remove-school"];
  if (!ACTIONS.includes(action)) return res.status(400).json({ error: "Invalid action." });
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  // Stage 2: per-action catalogue permissions (scope checked per target).
  const needPerm = action === "remove-school" ? "membership.revoke" : "membership.assign";

  try {
    const db = await getAdminDb();
    const ref = db.collection("memberships").doc(membershipId(uid, schoolId));
    const snap = await ref.get();
    if (!snap.exists || (snap.data() || {}).status !== "active") {
      return res.status(404).json({ error: "Active membership not found." });
    }
    const currentClass = (snap.data() || {}).classroomId || null;
    // Scope: classroom-scoped staff act only within their classrooms.
    // remove-school is school-wide (needs whole-school scope).
    const staff = await requirePermission(db, req, res, schoolId, needPerm, action === "remove-school" ? null : currentClass);
    if (!staff) return;
    const now = new Date().toISOString();

    if (action === "remove-school") {
      await ref.update({ status: "removed", removedAt: now, removedBy: user.uid, updatedAt: now });
      try {
        const { getAuth } = await import("firebase-admin/auth");
        await getAuth().revokeRefreshTokens(uid);
      } catch { /* best-effort token revocation; rule denial still applies */ }
      await audit(db, { actorUid: user.uid, action: "membership.revoke", targetUid: uid, schoolId, scope: "school" });
      return res.status(200).json({ ok: true, action });
    }

    if (action === "remove-classroom") {
      await ref.update({ classroomId: null, updatedAt: now });
      await audit(db, { actorUid: user.uid, action: "membership.update", targetUid: uid, schoolId, scope: "classroom:cleared" });
      return res.status(200).json({ ok: true, action });
    }

    // assign / move: classroom must exist and belong to schoolId (server check).
    if (typeof classroomId !== "string" || !classroomId.trim()) {
      return res.status(400).json({ error: "Invalid classroomId." });
    }
    const cls = await db.collection("classrooms").doc(classroomId).get();
    if (!cls.exists || (cls.data() || {}).schoolId !== schoolId) {
      return res.status(400).json({ error: "Classroom does not belong to this school." });
    }
    // Target-scope check: classroom-scoped staff cannot move students into
    // classrooms outside their own scope.
    const staff2 = await requirePermission(db, req, res, schoolId, "membership.assign", classroomId);
    if (!staff2) return;
    await ref.update({ classroomId, updatedAt: now });
    await audit(db, {
      actorUid: user.uid, action: "membership.update", targetUid: uid,
      schoolId, scope: `classroom:${classroomId}`,
    });
    return res.status(200).json({ ok: true, action, classroomId });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Update failed." });
  }
}
