/**
 * POST /api/school-overview — scoped staff dashboard data (minimum for UI).
 * Body: { schoolId }
 * Returns school name/policy, ACTIVE pin metadata (never hashes/plaintext),
 * pending join requests, and roster counts. Staff of the school only
 * (platform admins: any school). No emails, no hashes.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "school-overview", 30)) return;

  const { schoolId } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  try {
    const db = await getAdminDb();
    const staff = await requirePermission(db, req, res, schoolId, "roster.view");
    if (!staff) return;

    const school = await db.collection("schools").doc(schoolId).get();
    if (!school.exists) return res.status(404).json({ error: "School not found." });
    const sd = school.data() || {};

    const pinsSnap = await db.collection("joiningPins")
      .where("schoolId", "==", schoolId).where("status", "==", "active").get();
    const pins = pinsSnap.docs.map((d) => {
      const p = d.data() || {};
      return { pinId: d.id, classroomId: p.classroomId || null, expiresAt: p.expiresAt || null, useCount: p.useCount || 0 };
    });

    const reqSnap = await db.collection("joinRequests")
      .where("schoolId", "==", schoolId).where("status", "==", "pending").get();
    const pendingRequests = reqSnap.docs.slice(0, 100).map((d) => {
      const r = d.data() || {};
      return { id: d.id, uid: r.uid, classroomId: r.classroomId || null, createdAt: r.createdAt || null };
    });

    const roster = await db.collection("memberships")
      .where("schoolId", "==", schoolId).where("status", "==", "active").get();
    let students = 0, staffCount = 0;
    roster.forEach((d) => {
      const r = (d.data() || {}).role;
      if (r === "student") students += 1;
      else staffCount += 1;
    });

    return res.status(200).json({
      ok: true,
      school: { id: schoolId, name: sd.name || "", joinPolicy: sd.joinPolicy || "APPROVAL_REQUIRED" },
      pins, pendingRequests, counts: { students, staff: staffCount },
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Overview failed." });
  }
}
