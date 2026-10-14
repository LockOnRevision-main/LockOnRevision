/**
 * POST /api/list-invitations — platform-only invitation listing.
 * Body: { schoolId }. Returns metadata only (NEVER token hashes or emails
 * beyond the masked local-part needed to identify the invitee... in fact
 * even the email is returned ONLY to platform admins who created it).
 * No plaintext tokens are ever stored or returned here.
 */
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "list-invitations", 30)) return;

  const { schoolId } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    const snap = await db.collection("adminInvitations")
      .where("schoolId", "==", schoolId).get();
    const items = snap.docs.slice(0, 100).map((d) => {
      const v = d.data() || {};
      return {
        id: d.id, email: v.emailLower || "", role: v.role || "",
        status: v.status || "", expiresAt: v.expiresAt || null,
        createdAt: v.createdAt || null, resendCount: v.resendCount || 0,
        usedAt: v.usedAt || null,
      };
    }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return res.status(200).json({ ok: true, items });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Listing failed." });
  }
}
