#!/usr/bin/env node
/**
 * Beta 1.9 Prompt 44 — Stage E: safe migration into LockOnRevision Academy.
 *
 * Creates schools/academy + memberships/{uid}_academy for every student.
 * Additive, idempotent, batched, resumable, quota-aware, DRY-RUN by default.
 *
 *   node scripts/migrate-academy.mjs --dry-run            (default, no writes)
 *   node scripts/migrate-academy.mjs --apply [--batch 200] [--limit N] [--resume-after UID]
 *   node scripts/migrate-academy.mjs --reconcile          (counts + unmatched UIDs, no PII)
 *   node scripts/migrate-academy.mjs --rollback-list      (lists created membership ids from audit log)
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   (or FIRESTORE_EMULATOR_HOST for emulator tests — no credentials needed).
 *
 * Safety:
 *  - Never deletes/overwrites users, XP, Energy, Forge, timetables, analytics.
 *  - Membership ids deterministic ({uid}_academy) → re-runs create no duplicates.
 *  - DRY-RUN default; writes require --apply.
 *  - Batched (≤ batch size, default 200, Firestore limit 500) with pauses to
 *    stay inside Spark quotas.
 *  - Every run appends adminAuditLogs { action:'migration.run', note } with
 *    created ids (additive-change record for rollback identification).
 *  - Rollback = delete ONLY the membership ids listed in the audit record
 *    (script prints them; never touches users/*).
 *  - DO NOT run against production without owner approval + pre-migration
 *    export (see docs/MIGRATION_ACADEMY.md).
 */

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const APPLY = has("--apply");
const BATCH = Math.min(Number(opt("--batch", "200")) || 200, 450);
const LIMIT = Number(opt("--limit", "0")) || 0;
const RESUME_AFTER = opt("--resume-after", null);
const ACADEMY_ID = "academy";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mid = (uid) => `${String(uid).replace(/[^A-Za-z0-9_-]/g, "_")}_${ACADEMY_ID}`;

async function connect() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (getApps().length === 0) initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "demo-test" });
    return getFirestore();
  }
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey && privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error("[migrate] Missing service credentials. Set FIREBASE_* env or FIRESTORE_EMULATOR_HOST.");
    process.exit(1);
  }
  if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

async function listStudents(db) {
  // Eligible = all users/* docs (role != admin preferred but include all;
  // admins get a student membership too — harmless, keeps counts reconcilable).
  const snap = await db.collection("users").get();
  let uids = snap.docs.map((d) => d.id).sort();
  if (RESUME_AFTER) uids = uids.filter((u) => u > RESUME_AFTER);
  if (LIMIT > 0) uids = uids.slice(0, LIMIT);
  return { uids, total: snap.size };
}

async function main() {
  const db = await connect();
  const mode = has("--reconcile") ? "reconcile" : has("--rollback-list") ? "rollback-list" : APPLY ? "apply" : "dry-run";

  if (mode === "rollback-list") {
    const logs = await db.collection("adminAuditLogs").where("action", "==", "migration.run").get();
    const ids = [];
    logs.forEach((d) => { const c = d.data().createdIds || []; c.forEach((x) => ids.push(x)); });
    console.log(JSON.stringify({ rollbackCandidateMemberships: ids.length, ids: ids.slice(0, 50) }));
    console.log("[migrate] Rollback = delete ONLY these membership docs; never touch users/*.");
    return;
  }

  const { uids, total } = await listStudents(db);
  const existing = await db.collection("memberships").where("schoolId", "==", ACADEMY_ID).get();
  const have = new Set(existing.docs.map((d) => d.id));
  const missing = uids.filter((u) => !have.has(mid(u)));

  if (mode === "reconcile") {
    const unmatched = uids.filter((u) => !have.has(mid(u)));
    console.log(JSON.stringify({
      eligibleUsers: total, scopedTo: uids.length,
      academyMemberships: existing.size, missing: unmatched.length,
      unmatchedSample: unmatched.slice(0, 20), // UIDs only, no PII
    }));
    if (unmatched.length > 0) console.log("[migrate] DISCREPANCY: re-run migration --apply to close the gap.");
    else console.log("[migrate] RECONCILED: counts match.");
    return;
  }

  console.log(JSON.stringify({
    mode, academySchool: ACADEMY_ID, eligibleUsers: total, scoped: uids.length,
    alreadyMigrated: uids.length - missing.length, toCreate: missing.length, batch: BATCH,
  }));

  if (mode === "dry-run") {
    console.log(`[migrate] DRY-RUN: would create ${missing.length} memberships + schools/academy (if absent). No writes made.`);
    console.log(JSON.stringify({ sample: missing.slice(0, 10).map(mid) }));
    return;
  }

  // APPLY
  const schoolRef = db.collection("schools").doc(ACADEMY_ID);
  if (!(await schoolRef.get()).exists) {
    await schoolRef.set({
      name: "LockOnRevision Academy", type: "academy", country: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdByUid: "operator",
    });
    console.log("[migrate] created schools/academy");
  }

  const createdIds = [];
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const batch = db.batch();
    for (const uid of chunk) {
      const ref = db.collection("memberships").doc(mid(uid));
      batch.set(ref, {
        uid, schoolId: ACADEMY_ID, role: "student", classroomId: null,
        status: "active", createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), removedAt: null, removedBy: null,
      }, { merge: true });
      createdIds.push(mid(uid));
    }
    await batch.commit();
    console.log(`[migrate] committed ${Math.min(i + BATCH, missing.length)}/${missing.length}`);
    if (i + BATCH < missing.length) await sleep(1000); // quota-aware pause
  }

  await db.collection("adminAuditLogs").add({
    actorUid: "operator", action: "migration.run", targetUid: null, schoolId: ACADEMY_ID,
    scope: "platform", createdAt: new Date().toISOString(),
    note: `academy migration: created ${createdIds.length}`,
    createdIds,
  });
  console.log(JSON.stringify({ migrated: createdIds.length, audit: "migration.run appended" }));

  // Post-run reconciliation
  const after = await db.collection("memberships").where("schoolId", "==", ACADEMY_ID).get();
  console.log(JSON.stringify({ reconcile: { eligibleUsers: total, academyMemberships: after.size } }));
}

main().catch((e) => { console.error("[migrate] FAILED:", e.message); process.exit(1); });
