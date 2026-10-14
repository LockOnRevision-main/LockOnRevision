/**
 * POST /api/get-permissions — read a staff member's effective permissions.
 * Body: { uid, schoolId }. Any staff of the school (platform: any school).
 * Read-only (no audit — same justification as student-profile).
 */
import { effectivePermissions, defaultsForRole } from "../../shared/permissionsCatalogue.js";
import { getAdminDb, cors, authedUser, checkRate, requireSchoolStaff, membershipId } from "../lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "get-permissions", 60)) return;

  const { uid, schoolId } = req.body || {};
  if (typeof uid !== "string" || !uid.trim()) return res.status(400).json({ error: "Invalid uid." });
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  try {
    const db = await getAdminDb();
    const staff = await requireSchoolStaff(db, req, res, schoolId, ["school_admin", "coordinator", "teacher"]);
    if (!staff) return;
    const snap = await db.collection("memberships").doc(membershipId(uid, schoolId)).get();
    if (!snap.exists || (snap.data() || {}).status !== "active") {
      return res.status(404).json({ error: "Active membership not found." });
    }
    const m = snap.data() || {};
    const overrides = {
      grants: Array.isArray(m.permissionSet?.grants) ? m.permissionSet.grants : [],
      denies: Array.isArray(m.permissionSet?.denies) ? m.permissionSet.denies : [],
    };
    return res.status(200).json({
      ok: true,
      role: m.role,
      defaults: defaultsForRole(m.role),
      overrides,
      scopes: m.accessScopes ?? "all",
      effective: effectivePermissions(m.role, overrides),
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Fetch failed." });
  }
}
