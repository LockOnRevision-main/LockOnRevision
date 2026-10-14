/**
 * POST /api/create-pin — staff-only PIN generation.
 * Body: { schoolId, classroomId?, ttlMs? }
 * Auth: platform admin, or school_admin/coordinator of `schoolId`
 * (classroom PINs additionally require the classroom to belong to schoolId —
 * verified from the classrooms doc, never client claims).
 * Returns plaintext PIN ONCE; it is never stored or re-readable.
 */
import { generatePinCode, hashPin, pinDocIdFromHash, pinExpiryISO, PIN_DEFAULT_TTL_MS } from "./_lib/pins.js";
import { getAdminDb, cors, authedUser, checkRate, requirePermission, audit } from "./_lib/schoolServer.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "create-pin", 10)) return;

  const { schoolId, classroomId = null, ttlMs = PIN_DEFAULT_TTL_MS } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  if (classroomId !== null && (typeof classroomId !== "string" || !classroomId.trim())) {
    return res.status(400).json({ error: "Invalid classroomId." });
  }

  try {
    const db = await getAdminDb();
    const staff = await requirePermission(db, req, res, schoolId, "pin.generate", classroomId);
    if (!staff) return;

    // Scope binding verified server-side: classroom must belong to schoolId.
    if (classroomId) {
      const cls = await db.collection("classrooms").doc(classroomId).get();
      if (!cls.exists || (cls.data() || {}).schoolId !== schoolId) {
        return res.status(400).json({ error: "Classroom does not belong to this school." });
      }
    }

    // Stage 0.3: rotation + creation in ONE transaction — two concurrent
    // create-pin calls for the same scope can never leave two live PINs.
    let pinCode = null;
    let pinId = null;
    let pinExpiresAt = null;
    let rotatedIds = [];
    // Collision retry: tx.create fails if the hash id exists; outer loop
    // regenerates (astronomically unlikely).
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generatePinCode();
      let hash;
      try {
        hash = hashPin(code);
      } catch {
        return res.status(500).json({ error: "PIN service not configured." });
      }
      const candidateId = pinDocIdFromHash(hash);
      const now = new Date().toISOString();
      try {
        const rotated = await db.runTransaction(async (tx) => {
          let q = db.collection("joiningPins").where("schoolId", "==", schoolId).where("status", "==", "active");
          q = classroomId ? q.where("classroomId", "==", classroomId) : q.where("classroomId", "==", null);
          const prev = await tx.get(q);
          const ids = [];
          prev.forEach((d) => {
            if (d.id === candidateId) return; // same-hash rewrite guard
            tx.update(d.ref, { status: "revoked", revokedAt: now, revokedBy: user.uid });
            ids.push(d.id);
          });
          const expiresAt = pinExpiryISO(ttlMs);
          tx.create(db.collection("joiningPins").doc(candidateId), {
            codeHash: hash, schoolId, classroomId,
            status: "active", expiresAt,
            createdBy: user.uid, createdAt: now, useCount: 0,
            revokedAt: null, revokedBy: null,
          });
          return { ids, expiresAt };
        });
        pinCode = code;
        pinId = candidateId;
        pinExpiresAt = rotated.expiresAt;
        rotatedIds = rotated.ids;
        break;
      } catch (e) {
        if (e && (e.code === 6 || /already exists/i.test(e.message || ""))) continue;
        throw e;
      }
    }
    if (!pinCode) return res.status(500).json({ error: "Could not generate a unique PIN. Retry." });

    for (const rid of rotatedIds) {
      await audit(db, {
        actorUid: user.uid, action: "pin.revoke", targetUid: null,
        schoolId, scope: `pin:${rid}`,
      });
    }
    await audit(db, {
      actorUid: user.uid, action: "pin.create", targetUid: null,
      schoolId, scope: classroomId ? `classroom:${classroomId}` : "school",
    });
    // Plaintext returned ONCE; never logged (no PIN in logs).
    return res.status(200).json({ ok: true, pin: pinCode, pinId, expiresAt: pinExpiresAt });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "PIN creation failed." });
  }
}
