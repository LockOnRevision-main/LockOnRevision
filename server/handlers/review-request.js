/**
 * POST /api/review-request — scoped staff approve/reject joining requests.
 * Body: { requestId, decision: 'approved' | 'rejected' }
 * Only school_admin/coordinator of the REQUEST's school (platform admins
 * everywhere). Approval creates the membership atomically with the status
 * change. Valid transitions: pending -> approved|rejected only.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission, auditRef, auditData, membershipId } from "../lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "review-request", 30)) return;

  const { requestId, decision } = req.body || {};
  if (typeof requestId !== "string" || !requestId.trim()) return res.status(400).json({ error: "Invalid requestId." });
  if (decision !== "approved" && decision !== "rejected") {
    return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'." });
  }

  try {
    const db = await getAdminDb();
    const reqRef = db.collection("joinRequests").doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Request not found." });
    const jr = snap.data() || {};
    if (!jr.schoolId) return res.status(400).json({ error: "Malformed request." });

    const staff = await requirePermission(db, req, res, jr.schoolId, "request.review", jr.classroomId || null);
    if (!staff) return;
    if (jr.status !== "pending") {
      return res.status(409).json({ error: "Request already decided." });
    }

    const now = new Date().toISOString();
    // Stage 0.3: audit entry commits atomically with the change (same tx /
    // same batch). Audit ref created outside the tx: retry-safe.
    const reviewAudit = auditRef(db);
    const reviewEntry = {
      actorUid: user.uid, action: `join-request.${decision}`, targetUid: jr.uid,
      schoolId: jr.schoolId, scope: jr.classroomId ? `classroom:${jr.classroomId}` : "school",
    };
    if (decision === "approved") {
      await db.runTransaction(async (tx) => {
        const cur = await tx.get(reqRef);
        if ((cur.data() || {}).status !== "pending") {
          throw Object.assign(new Error("Request already decided."), { status: 409 });
        }
        tx.update(reqRef, { status: "approved", decidedBy: user.uid, decidedAt: now });
        const memRef = db.collection("memberships").doc(membershipId(jr.uid, jr.schoolId));
        const mem = await tx.get(memRef);
        tx.set(memRef, {
          uid: jr.uid, schoolId: jr.schoolId, role: "student",
          classroomId: jr.classroomId || (mem.exists ? (mem.data() || {}).classroomId || null : null),
          status: "active", createdAt: mem.exists ? (mem.data() || {}).createdAt || now : now,
          updatedAt: now, removedAt: null, removedBy: null,
        }, { merge: true });
        tx.set(reviewAudit, auditData(reviewEntry));
      });
    } else {
      const batch = db.batch();
      batch.update(reqRef, { status: "rejected", decidedBy: user.uid, decidedAt: now });
      batch.set(reviewAudit, auditData(reviewEntry));
      await batch.commit();
    }

    return res.status(200).json({ ok: true, decision });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Review failed." });
  }
}
