/**
 * POST /api/set-permissions — configure a staff member's permission
 * overrides + access scopes. Body:
 *   { uid, schoolId, grants?, denies?, accessScopes? }
 * Escalation prevention (all enforced here, server-side):
 *  - Caller must hold `permission.manage` in the school (default:
 *    school_admin only; teachers/coordinators never qualify unless
 *    explicitly granted, and teachers can never edit — see below).
 *  - Roles teacher/student can NEVER edit permissions, even with overrides
 *    (role gate, defence in depth against override mistakes).
 *  - No one may grant a permission they do not effectively hold themselves.
 *  - Scope of the new assignment must be ⊆ the caller's own scope
 *    (classroom-scoped editors stay inside their classrooms; platform
 *    admins are unbounded).
 *  - Target must hold an active STAFF role (school_admin/coordinator/
 *    teacher); students are excluded (role changes are separate).
 *  - Unknown permission names are rejected (400), never ignored.
 * Audited with before/after values. Takes effect on the next request
 * (server-side evaluation, no claims).
 */
import { validateOverrides, normaliseScopes, effectivePermissions } from "../../shared/permissionsCatalogue.js";
import { getAdminDb, cors, authedUser, checkRate, resolveStaff, isPlatformAdmin, auditRef, auditData, membershipId, writeStaffRecords } from "../lib/schoolServer.js";
import { mayAct } from "../../shared/permissionsCatalogue.js";

const EDITOR_ROLES = ["school_admin"];

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "set-permissions", 20)) return;

  const { uid, schoolId, grants = [], denies = [], accessScopes = "all" } = req.body || {};
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  let overrides, scopes;
  try {
    overrides = validateOverrides({ grants, denies });
    scopes = normaliseScopes(accessScopes);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  try {
    const db = await getAdminDb();
    const platform = await isPlatformAdmin(db, user.uid);
    const editor = platform
      ? { isPlatform: true, role: "platform_admin" }
      : await resolveStaff(db, user.uid, schoolId);
    if (!editor) return res.status(403).json({ error: "Insufficient school permission." });
    // Teachers/students can never edit, even with overrides granting the perm.
    if (!platform && !EDITOR_ROLES.includes(editor.role)) {
      return res.status(403).json({ error: "Insufficient school permission." });
    }
    if (!platform && !mayAct(editor, "permission.manage", null)) {
      return res.status(403).json({ error: "Insufficient school permission." });
    }

    const ref = db.collection("memberships").doc(membershipId(uid, schoolId));
    const snap = await ref.get();
    if (!snap.exists || (snap.data() || {}).status !== "active") {
      return res.status(404).json({ error: "Active membership not found." });
    }
    const target = snap.data() || {};
    if (!["school_admin", "coordinator", "teacher"].includes(target.role)) {
      return res.status(400).json({ error: "Only staff assignments are configurable." });
    }

    if (!platform) {
      // Must effectively hold every touched permission AT the target scope:
      // whole-school grants need whole-school holding; classroom grants
      // need holding in each granted classroom.
      const scopeClasses = scopes.scope === "all" ? [null] : scopes.classroomIds;
      for (const p of [...overrides.grants, ...overrides.denies]) {
        const held = scopeClasses.every((c) => mayAct(editor, p, c));
        if (!held) return res.status(403).json({ error: `You do not hold permission: ${p}` });
      }
      // New scope must be within the editor's own scope.
      if (editor.scopes?.scope !== "all") {
        const mine = new Set(editor.scopes.classroomIds || []);
        const wanted = scopes.scope === "all" ? ["*wider*"] : scopes.classroomIds;
        if (wanted.some((c) => !mine.has(c))) {
          return res.status(403).json({ error: "Scope exceeds your own access." });
        }
      }
    }

    const before = {
      permissionSet: target.permissionSet || null,
      accessScopes: target.accessScopes ?? "all",
    };
    const after = {
      permissionSet: { grants: overrides.grants, denies: overrides.denies },
      accessScopes: scopes.scope === "all" ? "all" : scopes.classroomIds,
    };
    // Stage 0.3+0.4: override change + ledger mirror + before/after audit
    // commit atomically via the shared helper.
    const batch = db.batch();
    await writeStaffRecords(db, batch, {
      uid, schoolId, role: target.role, status: "active",
      classroomId: target.classroomId ?? null,
      permissionSet: { grants: overrides.grants, denies: overrides.denies },
      accessScopes: scopes.scope === "all" ? "all" : scopes.classroomIds,
      now: new Date().toISOString(),
    });
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "permission.change", targetUid: uid,
      schoolId, scope: `role:${target.role}`,
      before: JSON.stringify(before).slice(0, 1000),
      after: JSON.stringify(after).slice(0, 1000),
    }));
    await batch.commit();
    return res.status(200).json({
      ok: true,
      effective: effectivePermissions(target.role, overrides),
      scopes,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Update failed." });
  }
}
