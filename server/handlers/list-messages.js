/**
 * POST /api/school?action=list-messages
 * Lists conversations the caller is a participant in for one school.
 * School staff never receive another school's threads; students never
 * receive another student's inbox. Body: { schoolId, conversationId? }
 */
import { getAdminDb, cors, authedUser, checkRate, membershipId, isPlatformAdmin } from "../lib/schoolServer.js";
import { isStaffRole } from "../../shared/expertMessaging.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "list-messages", 30)) return;

  const { schoolId, conversationId } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) {
    return res.status(400).json({ error: "Invalid schoolId." });
  }
  if (conversationId !== undefined && conversationId !== null) {
    if (typeof conversationId !== "string" || !conversationId.trim() || conversationId.length > 700) {
      return res.status(400).json({ error: "Invalid conversationId." });
    }
  }

  try {
    const db = await getAdminDb();
    const sid = schoolId.trim();
    const snap = await db.collection("memberships").doc(membershipId(user.uid, sid)).get();
    const data = snap.data() || {};
    const platform = await isPlatformAdmin(db, user.uid);
    if (data.status !== "active" && !platform) {
      return res.status(403).json({ error: "You are not an active member of this school." });
    }

    const role = data.role || (platform ? "platform_admin" : null);
    const isStaff = isStaffRole(role) || platform;
    const viewer = isStaff ? "staff" : (role === "student" ? "student" : "none");
    if (viewer === "none") {
      return res.status(403).json({ error: "You are not allowed to view school messages." });
    }

    let q = db.collection("schoolMessages").where("schoolId", "==", sid);
    if (!(platform && !isStaffRole(role) && data.status !== "active")) {
      q = q.where("participantIds", "array-contains", user.uid);
    }
    if (conversationId) {
      q = q.where("conversationId", "==", conversationId.trim());
    }
    q = q.limit(200);

    const docs = (await q.get()).docs;
    const messages = docs.map((d) => {
      const m = d.data() || {};
      return {
        id: d.id,
        conversationId: m.conversationId || null,
        senderId: m.senderId || null,
        recipientId: m.recipientId || null,
        studentId: m.studentId || null,
        staffId: m.staffId || null,
        message: m.message || "",
        tag: m.tag || null,
        createdAt: m.createdAt || null,
      };
    }).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

    const byConv = {};
    for (const m of messages) {
      const key = m.conversationId || m.id;
      if (!byConv[key]) byConv[key] = [];
      byConv[key].push(m);
    }
    const conversations = Object.entries(byConv).map(([id, msgs]) => {
      const last = msgs[msgs.length - 1];
      const peerId = last.senderId === user.uid ? last.recipientId : last.senderId;
      return {
        id,
        peerId,
        studentId: last.studentId,
        staffId: last.staffId,
        tag: msgs.find((x) => x.tag)?.tag || null,
        updatedAt: last.createdAt,
        messages: msgs,
      };
    }).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    return res.status(200).json({ ok: true, viewer, conversations, messages });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Message list failed." });
  }
}
