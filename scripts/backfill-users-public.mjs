#!/usr/bin/env node
/**
 * Prompt 45 — Stage 1: users_public backfill for all existing users.
 * Additive, idempotent, DRY-RUN by default, batched, resumable, quota-aware,
 * with reconciliation and documented rollback. NEVER deletes users/* data.
 *
 *   node scripts/backfill-users-public.mjs --dry-run        (default)
 *   node scripts/backfill-users-public.mjs --apply [--batch 200] [--limit N] [--resume-after UID]
 *   node scripts/backfill-users-public.mjs --reconcile
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   (or FIRESTORE_EMULATOR_HOST for emulator runs).
 *
 * Projection fields (leaderboard-safe only — never email/isAdmin/role):
 *   name, username, displayName, avatarUrl, avatarIcon, xp, energy,
 *   totalScore, grade, curriculum, searchName (lowercased name for
 *   prefix search), updatedAt.
 * Rollback = delete ONLY users_public docs created by the run ids recorded
 * in the adminAuditLogs(action:'users-public.backfill') entry.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function projectData(d) {
  return {
    name: typeof d.name === "string" ? d.name.slice(0, 120) : "",
    username: typeof d.username === "string" ? d.username.slice(0, 80) : "",
    displayName: typeof d.name === "string" ? d.name.slice(0, 120) : "",
    avatarUrl: typeof d.avatarUrl === "string" ? d.avatarUrl.slice(0, 500) : "",
    avatarIcon: typeof d.avatarIcon === "string" ? d.avatarIcon.slice(0, 80) : "",
    xp: typeof d.xp === "number" ? d.xp : 0,
    energy: typeof d.energy === "number" ? d.energy : 0,
    totalScore: typeof d.totalScore === "number" ? d.totalScore : (typeof d.xp === "number" ? d.xp : 0) + (typeof d.energy === "number" ? d.energy : 0) * 100,
    grade: typeof d.grade === "string" ? d.grade.slice(0, 40) : "",
    curriculum: typeof d.curriculum === "string" ? d.curriculum.slice(0, 80) : "",
    searchName: typeof d.name === "string" ? d.name.trim().toLowerCase().slice(0, 120) : "",
    updatedAt: new Date().toISOString(),
  };
}

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
    console.error("[backfill] Missing service credentials. Set FIREBASE_* env or FIRESTORE_EMULATOR_HOST.");
    process.exit(1);
  }
  if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

async function main() {
  const db = await connect();
  const mode = has("--reconcile") ? "reconcile" : APPLY ? "apply" : "dry-run";

  const usersSnap = await db.collection("users").get();
  let docs = usersSnap.docs.sort((a, b) => (a.id < b.id ? -1 : 1));
  if (RESUME_AFTER) docs = docs.filter((d) => d.id > RESUME_AFTER);
  if (LIMIT > 0) docs = docs.slice(0, LIMIT);

  if (mode === "reconcile") {
    const pubSnap = await db.collection("users_public").get();
    const have = new Set(pubSnap.docs.map((d) => d.id));
    const missing = usersSnap.docs.map((d) => d.id).filter((id) => !have.has(id));
    console.log(JSON.stringify({
      eligibleUsers: usersSnap.size, usersPublic: pubSnap.size,
      missing: missing.length, missingSample: missing.slice(0, 20),
    }));
    console.log(missing.length === 0 ? "[backfill] RECONCILED." : "[backfill] DISCREPANCY: re-run --apply.");
    return;
  }

  // Freshness check: which docs are missing or stale (totalScore drift)?
  const pubSnap = await db.collection("users_public").get();
  const pubMap = new Map(pubSnap.docs.map((d) => [d.id, d.data()]));
  const pending = [];
  for (const doc of docs) {
    const d = doc.data() || {};
    const p = pubMap.get(doc.id);
    const expected = (typeof d.xp === "number" ? d.xp : 0) + (typeof d.energy === "number" ? d.energy : 0) * 100;
    if (!p || (p.totalScore ?? 0) !== (typeof d.totalScore === "number" ? d.totalScore : expected)) {
      pending.push(doc);
    }
  }

  console.log(JSON.stringify({
    mode, eligibleUsers: usersSnap.size, scoped: docs.length,
    alreadyFresh: docs.length - pending.length, toWrite: pending.length, batch: BATCH,
  }));

  if (mode === "dry-run") {
    console.log(`[backfill] DRY-RUN: would upsert ${pending.length} users_public docs. No writes made.`);
    console.log(JSON.stringify({ sample: pending.slice(0, 10).map((d) => d.id) }));
    return;
  }

  const written = [];
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.set(db.collection("users_public").doc(doc.id), projectData(doc.data() || {}), { merge: true });
      written.push(doc.id);
    }
    await batch.commit();
    console.log(`[backfill] committed ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
    if (i + BATCH < pending.length) await sleep(1000);
  }

  await db.collection("adminAuditLogs").add({
    actorUid: "operator", action: "users-public.backfill", targetUid: null,
    schoolId: null, scope: "platform", createdAt: new Date().toISOString(),
    note: `users_public backfill: upserted ${written.length}`,
    createdIds: written,
  });
  console.log(JSON.stringify({ upserted: written.length, audit: "users-public.backfill appended" }));
}

main().catch((e) => { console.error("[backfill] FAILED:", e.message); process.exit(1); });
