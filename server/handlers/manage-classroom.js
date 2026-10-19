/**
 * POST /api/manage-classroom — classroom lifecycle (Prompt 48).
 * Body: { action, schoolId?, classroomId?, name?, yearGroup? }
 * Actions:
 *  - create:     classroom.manage; school must exist; schoolId immutable after.
 *  - update:     classroom.manage; name/yearGroup only — schoolId never moves
 *                (school boundary preserved; cross-school moves rejected).
 *  - deactivate: classroom.manage; soft-deactivate (status='archived') —
 *                NEVER hard-deletes: memberships, users/{uid} and all learning
 *                subcollections (XP/Energy/Forge/timetables/analytics) kept.
 * All actions audited atomically (batch). Rate-limited.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission, auditRef, auditData } from "../lib/schoolServer.js";
import { validateClassroomInput } from "../lib/validation.js";

const ACTIONS = ["create", "update", "deactivate"];
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "class";
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "manage-classroom", 20)) return;

  const { action, schoolId, classroomId, name, yearGroup } = req.body || {};
  if (!ACTIONS.includes(action)) return res.status(400).json({ error: "Invalid action." });

  try {
    const db = await getAdminDb();
    const now = new Date().toISOString();

    if (action === "create") {
      let input;
      try {
        input = validateClassroomInput({ schoolId, name, yearGroup: yearGroup ?? null });
      } catch (e) {
        return res.status(e.status || 400).json({ error: e.message });
      }
      const staff = await requirePermission(db, req, res, input.schoolId, "classroom.manage");
      if (!staff) return;
      if (!(await db.collection("schools").doc(input.schoolId).get()).exists) {
        return res.status(404).json({ error: "School not found." });
      }
      const id = classroomId && typeof classroomId === "string" && classroomId.trim()
        ? classroomId.trim().slice(0, 128)
        : `${slug(input.name)}-${Date.now().toString(36)}`;
      if (!ID_RE.test(id)) return res.status(400).json({ error: "Invalid classroomId." });
      const ref = db.collection("classrooms").doc(id);
      if ((await ref.get()).exists) return res.status(409).json({ error: "Classroom already exists." });
      const batch = db.batch();
      batch.create(ref, {
        schoolId: input.schoolId, name: input.name, yearGroup: input.yearGroup,
        status: "active", createdAt: now, updatedAt: now, createdByUid: user.uid,
      });
      batch.set(auditRef(db), auditData({
        actorUid: user.uid, action: "classroom.create", targetUid: null,
        schoolId: input.schoolId, scope: `classroom:${id}`,
      }));
      await batch.commit();
      return res.status(200).json({ ok: true, action, classroomId: id });
    }

    // update / deactivate: school boundary comes from the STORED doc, never the client.
    if (typeof classroomId !== "string" || !classroomId.trim()) {
      return res.status(400).json({ error: "Invalid classroomId." });
    }
    const ref = db.collection("classrooms").doc(classroomId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Classroom not found." });
    const current = snap.data() || {};
    if (!current.schoolId) return res.status(500).json({ error: "Classroom has no school." });
    const staff = await requirePermission(db, req, res, current.schoolId, "classroom.manage");
    if (!staff) return;

    if (action === "update") {
      if (schoolId !== undefined && schoolId !== null && schoolId !== current.schoolId) {
        return res.status(400).json({ error: "Classroom cannot be moved between schools." });
      }
      const patch = {};
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim() || name.length > 120) {
          return res.status(400).json({ error: "Invalid name." });
        }
        patch.name = name.trim();
      }
      if (yearGroup !== undefined) {
        if (yearGroup !== null && (typeof yearGroup !== "string" || yearGroup.length > 40)) {
          return res.status(400).json({ error: "Invalid yearGroup." });
        }
        patch.yearGroup = yearGroup || null;
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update." });
      patch.updatedAt = now;
      const batch = db.batch();
      batch.update(ref, patch);
      batch.set(auditRef(db), auditData({
        actorUid: user.uid, action: "classroom.update", targetUid: null,
        schoolId: current.schoolId, scope: `classroom:${classroomId}`,
      }));
      await batch.commit();
      return res.status(200).json({ ok: true, action, classroomId });
    }

    // deactivate: idempotent soft-close; memberships + learning data untouched.
    if ((current.status || "active") === "archived") {
      return res.status(200).json({ ok: true, action, classroomId, already: true });
    }
    const batch = db.batch();
    batch.update(ref, { status: "archived", archivedAt: now, archivedBy: user.uid, updatedAt: now });
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "classroom.deactivate", targetUid: null,
      schoolId: current.schoolId, scope: `classroom:${classroomId}`,
    }));
    await batch.commit();
    return res.status(200).json({ ok: true, action, classroomId });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Classroom update failed." });
  }
}
