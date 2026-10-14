/**
 * POST /api/revoke-pin — staff-only PIN revocation.
 * Body: { pinId, schoolId }
 * Revoked PINs never redeem. Audited. Idempotent.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission, auditRef, auditData } from "../lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "revoke-pin", 20)) return;

  const { pinId, schoolId } = req.body || {};
  if (typeof pinId !== "string" || !pinId.trim()) return res.status(400).json({ error: "Invalid pinId." });
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  try {
    const db = await getAdminDb();
    const staff = await requirePermission(db, req, res, schoolId, "pin.revoke");
    if (!staff) return;
    const ref = db.collection("joiningPins").doc(pinId);
    const snap = await ref.get();
    if (!snap.exists || (snap.data() || {}).schoolId !== schoolId) {
      return res.status(404).json({ error: "PIN not found." });
    }
    const now = new Date().toISOString();
    // Stage 0.3: revocation + audit commit atomically.
    const batch = db.batch();
    batch.update(ref, { status: "revoked", revokedAt: now, revokedBy: user.uid });
    batch.set(auditRef(db), auditData({ actorUid: user.uid, action: "pin.revoke", targetUid: null, schoolId, scope: `pin:${pinId}` }));
    await batch.commit();
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Revocation failed." });
  }
}
