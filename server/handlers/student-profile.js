/**
 * POST /api/student-profile — scoped read view of one student's profile.
 * Body: { uid, schoolId }
 * Caller must hold school_admin/coordinator/teacher in `schoolId`
 * (platform admins: any school). Returns ONLY data the role may see and
 * ONLY the membership for the requested school — never the student's other
 * schools. No email. No XP internals beyond totals the staff role needs.
 *
 * Audit decision: reads are NOT audited. Justification: profile views are
 * high-volume; per-read audit writes would flood adminAuditLogs and burn
 * Spark write quota (20K/day), degrading the audit trail for WRITES
 * (assign/remove/policy), which are the actions that change access.
 * All mutations remain audited.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission } from "../lib/schoolServer.js";
import { membershipId } from "../lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "student-profile", 60)) return;

  const { uid, schoolId } = req.body || {};
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  try {
    const db = await getAdminDb();
    const mem = await db.collection("memberships").doc(membershipId(uid, schoolId)).get();
    if (!mem.exists || (mem.data() || {}).status !== "active") {
      return res.status(404).json({ error: "Student not found in this school." });
    }
    // Scope: classroom-scoped staff may view only their classrooms' students.
    const staff = await requirePermission(db, req, res, schoolId, "profile.view", (mem.data() || {}).classroomId || null);
    if (!staff) return;
    const pub = await db.collection("users_public").doc(uid).get();
    const p = pub.exists ? pub.data() || {} : {};
    const m = mem.data() || {};
    return res.status(200).json({
      ok: true,
      profile: {
        uid,
        name: p.displayName || p.name || "",
        username: p.username || "",
        avatarUrl: p.avatarUrl || "", avatarIcon: p.avatarIcon || "",
        grade: p.grade || "", curriculum: p.curriculum || "",
        totalScore: typeof p.totalScore === "number" ? p.totalScore : 0,
        classroomId: m.classroomId || null,
        role: m.role, status: m.status,
        schoolId, // requested school ONLY — other memberships never listed
      },
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Profile fetch failed." });
  }
}
