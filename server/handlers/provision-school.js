/**
 * POST /api/provision-school — platform-admin-only creation of an external
 * school + assignment of an existing verified user as its school_admin, plus
 * a single generated school-scoped join PIN.
 * Body: { name, country?, adminUid, schoolId? }
 * No invitation emails/tokens (Beta 2.0). adminInvitations stays deny-only.
 * New school_admin is scoped strictly to the new school (single membership
 * doc). A school PIN grants join eligibility only, never administrative
 * authority. School + staff record + PIN + audits commit in ONE batch.
 * Audited. Rate-limited.
 */
import { generatePinCode, hashPin, pinDocIdFromHash, pinExpiryISO, PIN_DEFAULT_TTL_MS } from "../lib/pins.js";
import { getAdminDb, cors, authedUser, checkRate, isPlatformAdmin, auditRef, auditData, writeStaffRecords } from "../lib/schoolServer.js";

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "school";
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "provision-school", 5)) return;

  const { name, country = null, adminUid, schoolId = null } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 120) {
    return res.status(400).json({ error: "Invalid name." });
  }
  if (typeof adminUid !== "string" || !adminUid.trim()) return res.status(400).json({ error: "Invalid adminUid." });

  try {
    const db = await getAdminDb();
    if (!(await isPlatformAdmin(db, user.uid))) {
      return res.status(403).json({ error: "Platform admin required." });
    }
    // Existing, verified user (by UID) — throws if unknown. No email flows.
    const { getAuth } = await import("firebase-admin/auth");
    await getAuth().getUser(adminUid);

    const id = schoolId && typeof schoolId === "string" && schoolId.trim()
      ? schoolId.trim().slice(0, 80)
      : `${slug(name)}-${Date.now().toString(36)}`;
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return res.status(400).json({ error: "Invalid schoolId." });
    const schoolRef = db.collection("schools").doc(id);
    if ((await schoolRef.get()).exists) return res.status(409).json({ error: "School already exists." });

    const now = new Date().toISOString();
    // Generate a secure, random school-scoped join PIN (hash-only storage,
    // pepper-protected, never derived from school data). Fail closed if the
    // pepper is unconfigured.
    let pinCode = null, pinId = null, pinExpiresAt = null, pinHash = null;
    try {
      pinCode = generatePinCode();
      pinHash = hashPin(pinCode);
      pinId = pinDocIdFromHash(pinHash);
      pinExpiresAt = pinExpiryISO(PIN_DEFAULT_TTL_MS);
    } catch {
      return res.status(500).json({ error: "PIN service not configured." });
    }

    // Stage 0.3: school + membership + ledger + PIN + both audits in ONE
    // atomic batch. Retries hit the "school already exists" 409 before any
    // write, so no duplicate school or PIN record can be created.
    const batch = db.batch();
    batch.create(schoolRef, {
      name: name.trim(), type: "external", country: country || null,
      joinPolicy: "APPROVAL_REQUIRED", // safe default
      createdAt: now, updatedAt: now, createdByUid: user.uid,
    });
    // Stage 0.4: membership + ledger via the shared helper (same batch).
    await writeStaffRecords(db, batch, {
      uid: adminUid, schoolId: id, role: "school_admin", status: "active",
      classroomId: null, now,
    });
    batch.create(db.collection("joiningPins").doc(pinId), {
      codeHash: pinHash, schoolId: id, classroomId: null,
      status: "active", expiresAt: pinExpiresAt,
      createdBy: user.uid, createdAt: now, useCount: 0,
      revokedAt: null, revokedBy: null,
    });
    batch.set(auditRef(db), auditData({ actorUid: user.uid, action: "school.provision", targetUid: adminUid, schoolId: id, scope: "platform" }));
    batch.set(auditRef(db), auditData({ actorUid: user.uid, action: "staff.assign", targetUid: adminUid, schoolId: id, scope: "role:school_admin" }));
    batch.set(auditRef(db), auditData({ actorUid: user.uid, action: "pin.create", targetUid: null, schoolId: id, scope: "school" }));
    await batch.commit();
    // Plaintext PIN returned ONCE; never stored or logged.
    return res.status(200).json({ ok: true, schoolId: id, pin: pinCode, pinId, expiresAt: pinExpiresAt });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Provisioning failed." });
  }
}
