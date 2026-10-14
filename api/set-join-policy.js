/**
 * POST /api/set-join-policy — school joining policy config.
 * Body: { schoolId, joinPolicy: 'IMMEDIATE' | 'APPROVAL_REQUIRED' }
 * Only that school's school_admin (or platform admin). Audited.
 * Default for new schools: APPROVAL_REQUIRED (safer).
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission, audit } from "./_lib/schoolServer.js";

export const JOIN_POLICIES = ["IMMEDIATE", "APPROVAL_REQUIRED"];
export const DEFAULT_JOIN_POLICY = "APPROVAL_REQUIRED";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "set-join-policy", 10)) return;

  const { schoolId, joinPolicy } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  if (!JOIN_POLICIES.includes(joinPolicy)) return res.status(400).json({ error: "Invalid joinPolicy." });

  try {
    const db = await getAdminDb();
    const staff = await requirePermission(db, req, res, schoolId, "policy.manage");
    if (!staff) return;
    await db.collection("schools").doc(schoolId).update({
      joinPolicy, updatedAt: new Date().toISOString(),
    });
    await audit(db, {
      actorUid: user.uid, action: "school.policy-change", targetUid: null,
      schoolId, scope: `joinPolicy:${joinPolicy}`,
    });
    return res.status(200).json({ ok: true, joinPolicy });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Policy update failed." });
  }
}
