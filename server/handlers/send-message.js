/**
 * POST /api/school?action=send-message
 * Students contact eligible school staff via @teacher / @coordinator / @principal
 * (or a verified recipientId). Staff may reply only within an existing
 * conversation with a student in the same school.
 * Body: { schoolId, message, tag?, recipientId? }
 * Sender identity is always the authenticated uid.
 */
import { getAdminDb, cors, authedUser, checkRate, auditRef, auditData, membershipId, isPlatformAdmin } from "../lib/schoolServer.js";
import { assertString } from "../lib/validation.js";
import {
  conversationId, isStaffRole, pickUniqueUid, roleForTag, singleExpertTag,
} from "../../shared/expertMessaging.js";

function fail(status, message, code) {
  const e = new Error(message);
  e.status = status;
  if (code) e.code = code;
  throw e;
}

async function activeMember(db, uid, schoolId) {
  const snap = await db.collection("memberships").doc(membershipId(uid, schoolId)).get();
  const data = snap.data() || {};
  if (data.status !== "active") return null;
  return { ...data, uid: data.uid || uid, schoolId: data.schoolId || schoolId };
}

async function staffUidsForRole(db, schoolId, role) {
  const q = await db.collection("memberships")
    .where("schoolId", "==", schoolId)
    .where("role", "==", role)
    .where("status", "==", "active")
    .limit(25)
    .get();
  return q.docs.map((d) => (d.data() || {}).uid).filter(Boolean);
}

async function conversationExists(db, schoolId, a, b) {
  const cid = conversationId(schoolId, a, b);
  const snap = await db.collection("schoolMessages")
    .where("conversationId", "==", cid)
    .limit(1)
    .get();
  return !snap.empty;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "send-message", 30)) return;

  try {
    const { schoolId, recipientId, message, tag } = req.body || {};
    assertString(schoolId, "schoolId", { max: 128 });
    assertString(message, "message", { max: 2000 });
    if (tag !== undefined && tag !== null) assertString(tag, "tag", { max: 100, optional: true });
    if (recipientId !== undefined && recipientId !== null) {
      assertString(recipientId, "recipientId", { max: 128 });
    }

    const db = await getAdminDb();
    const sid = schoolId.trim();
    const text = message.trim();
    const requestedRecipient = typeof recipientId === "string" && recipientId.trim() ? recipientId.trim() : null;
    if (requestedRecipient === user.uid) fail(400, "You cannot message yourself.");

    const senderMem = await activeMember(db, user.uid, sid);
    const platform = await isPlatformAdmin(db, user.uid);
    if (!senderMem && !platform) {
      return res.status(403).json({ error: "You are not an active member of this school." });
    }

    const senderRole = senderMem?.role || (platform ? "platform_admin" : null);
    const senderIsStaff = isStaffRole(senderRole) || platform;
    const senderIsStudent = senderRole === "student";
    if (!senderIsStaff && !senderIsStudent) {
      return res.status(403).json({ error: "You are not allowed to send school messages." });
    }

    const tagSource = `${tag || ""} ${text}`;
    const roleTag = singleExpertTag(tagSource);

    let toUid = requestedRecipient;

    if (senderIsStudent || (!senderIsStaff && platform && roleTag)) {
      if (roleTag) {
        const role = roleForTag(roleTag);
        const uids = await staffUidsForRole(db, sid, role);
        toUid = pickUniqueUid(uids, {
          noneMessage: `No eligible @${roleTag} is available at this school.`,
          manyMessage: `Multiple @${roleTag} staff are available. Messaging is not sent until a unique recipient is identified.`,
        });
        if (requestedRecipient && requestedRecipient !== toUid) {
          fail(409, "Tagged recipient does not match the given recipient.", "recipient_mismatch");
        }
      } else if (requestedRecipient) {
        const rec = await activeMember(db, requestedRecipient, sid);
        if (!rec || !isStaffRole(rec.role)) {
          fail(403, "Recipient is not an eligible administrator for this school.", "recipient_ineligible");
        }
        toUid = requestedRecipient;
      } else {
        fail(400, "Name a recipient with @teacher, @coordinator, or @principal.");
      }
    } else {
      // Staff / platform reply: only to a student in an existing conversation.
      if (!requestedRecipient) fail(400, "Select the student conversation to reply to.");
      const rec = await activeMember(db, requestedRecipient, sid);
      if (!rec || rec.role !== "student") {
        fail(403, "Staff may only reply to students in this school.", "recipient_ineligible");
      }
      const exists = await conversationExists(db, sid, user.uid, requestedRecipient);
      if (!exists && !platform) {
        fail(403, "No conversation with this student. Students start the thread.", "conversation_missing");
      }
      toUid = requestedRecipient;
    }

    const recMem = await activeMember(db, toUid, sid);
    if (!recMem) fail(403, "Recipient is not an active member of this school.", "recipient_ineligible");

    const studentUid = senderIsStudent ? user.uid : toUid;
    const staffUid = senderIsStudent ? toUid : user.uid;
    const cid = conversationId(sid, studentUid, staffUid);
    const now = new Date().toISOString();
    const msgRef = db.collection("schoolMessages").doc();
    const aRef = auditRef(db);

    const batch = db.batch();
    batch.set(msgRef, {
      schoolId: sid,
      conversationId: cid,
      senderId: user.uid,
      recipientId: toUid,
      participantIds: [user.uid, toUid],
      studentId: studentUid,
      staffId: staffUid,
      message: text,
      tag: roleTag ? `@${roleTag}` : (tag ? String(tag).trim() : null),
      createdAt: now,
    });
    batch.set(aRef, auditData({
      actorUid: user.uid,
      action: "message.send",
      targetUid: toUid,
      schoolId: sid,
      scope: "school",
      messageId: msgRef.id,
      conversationId: cid,
    }));
    await batch.commit();

    return res.status(200).json({
      ok: true,
      messageId: msgRef.id,
      conversationId: cid,
      recipientId: toUid,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Message send failed." });
  }
}
