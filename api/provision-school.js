/**
 * POST /api/provision-school — platform-admin-only creation of an external
 * school + assignment of an existing verified user as its school_admin.
 * Body: { name, country?, adminUid, schoolId? }
 * No invitation emails/tokens (Beta 2.0). adminInvitations stays deny-only.
 * New school_admin is scoped strictly to the new school (single membership
 * doc). Audited. Rate-limited.
 */
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin, audit, membershipId } from "./_lib/schoolServer.js";

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "school";
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "provision-school", 5)) return;

  const { name, country = null, adminUid, schoolId = null } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 120) {
    return res.status(400).json({ error: "Invalid name." });
  }
  if (typeof adminUid !== "string" || !adminUid.trim()) return res.status(400).json({ error: "Invalid adminUid." });

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    // Existing, verified user (by UID) — throws if unknown. No email flows.
    const { getAuth } = await import("firebase-admin/auth");
    await getAuth().getUser(adminUid);

    const id = schoolId && typeof schoolId === "string" && schoolId.trim()
      ? schoolId.trim().slice(0, 80)
      : `${slug(name)}-${Date.now().toString(36)}`;
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return res.status(400).json({ error: "Invalid schoolId." });
    const schoolRef = db.collection("schools").doc(id);
    if ((await schoolRef.get()).exists) return res.status(409).json({ error: "School already exists." });

    const now = new Date().toISOString();
    await schoolRef.create({
      name: name.trim(), type: "external", country: country || null,
      joinPolicy: "APPROVAL_REQUIRED", // safe default
      createdAt: now, updatedAt: now, createdByUid: user.uid,
    });
    const mid = membershipId(adminUid, id);
    await db.collection("memberships").doc(mid).set({
      uid: adminUid, schoolId: id, role: "school_admin", classroomId: null,
      status: "active", createdAt: now, updatedAt: now, removedAt: null, removedBy: null,
    });
    await db.collection("staffAssignments").doc(`${mid}_school_admin`).set({
      uid: adminUid, schoolId: id, classroomId: null, role: "school_admin",
      status: "active", createdAt: now, updatedAt: now,
    });
    await audit(db, { actorUid: user.uid, action: "school.provision", targetUid: adminUid, schoolId: id, scope: "platform" });
    await audit(db, { actorUid: user.uid, action: "staff.assign", targetUid: adminUid, schoolId: id, scope: "role:school_admin" });
    return res.status(200).json({ ok: true, schoolId: id });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Provisioning failed." });
  }
}
