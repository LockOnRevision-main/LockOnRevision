#!/usr/bin/env node
/**
 * Beta 2.0 Part 2 — Stage 0.7: read-only Firestore backup for Spark.
 * Managed export requires Blaze (verified official docs), so Spark needs
 * this Admin-SDK read path. NEVER writes to Firestore; writes only local
 * JSON under backups/ (git-ignored). NEVER prints document contents —
 * logs carry counts and ids only.
 *
 *   node scripts/export-backup.mjs                        (dry-run: plan + formula, ZERO reads)
 *   node scripts/export-backup.mjs --estimate              (7-read probe + arithmetic, no bulk reads)
 *   node scripts/export-backup.mjs --apply [--out backups/TS] [--resume-after col/docId] [--include-learning]
 *   node scripts/export-backup.mjs --apply --limit-users N (canary)
 *
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   (or FIRESTORE_EMULATOR_HOST for emulator runs — no credentials needed).
 * Quota: 1 read per document exported (+ subcollections with
 * --include-learning). 50K reads/day free → plan multi-day runs for large
 * bases (see manifest + final report quota table). DO NOT run against
 * production without owner approval.
 */

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const APPLY = has("--apply");
const ESTIMATE = has("--estimate");
const INCLUDE_LEARNING = has("--include-learning");
const LIMIT_USERS = Number(opt("--limit-users", "0")) || 0;
const RESUME_AFTER = opt("--resume-after", null);
const PAGE = 200;

const TOP_COLLECTIONS = [
  "users", "users_public", "schools", "classrooms",
  "memberships", "staffAssignments", "adminAuditLogs",
];
const LEARNING_SUBS = [
  "subjects", "units", "subUnits", "lessons", "questions", "answers",
  "exerciseAnswers", "files", "forgeSources", "timetables",
  "timetableDocuments", "timetableMetadata", "timetableMetadataHistory",
  "mastery", "sessions", "dailyChallenge", "dailyChallengeHistory",
];

export function costFormula() {
  return [
    "reads = sum(documents exported) + 7 probe reads",
    "top-level: users + users_public + schools + classrooms + memberships + staffAssignments + adminAuditLogs",
    "with --include-learning: + every learning subcollection doc of every user",
    "writes: 0 (local JSON only). Deletes: 0.",
    "plan: reads ≈ users*(1 + avg learning docs if flagged) + roster docs. At 50K/day, divide total by 40000 for safe days.",
  ].join("\n");
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
    console.error("[export] Missing service credentials. Set FIREBASE_* env or FIRESTORE_EMULATOR_HOST.");
    process.exit(1);
  }
  if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

async function main() {
  console.log("[export] mode:", APPLY ? "APPLY" : ESTIMATE ? "ESTIMATE" : "DRY-RUN");
  console.log("[export] cost model (no reads performed yet):\n" + costFormula());

  if (!APPLY && !ESTIMATE) {
    console.log("[export] DRY-RUN: zero reads performed, nothing written.");
    console.log("[export] Next: --estimate for count-only costs, or --apply to export.");
    return;
  }

  const { default: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const db = await connect();

  if (ESTIMATE) {
    // 7-read probe (firebase-admin v10 has no count() aggregation):
    // proves access + non-empty signal per collection, then arithmetic.
    let probe = 0;
    for (const col of TOP_COLLECTIONS) {
      const snap = await db.collection(col).limit(1).get();
      probe += snap.size;
      console.log(JSON.stringify({ collection: col, nonEmpty: !snap.empty }));
    }
    const assumeUsers = Number(opt("--assume-users", "0")) || 0;
    const assumeLearning = Number(opt("--assume-learning-per-user", "0")) || 0;
    const projected = assumeUsers > 0
      ? assumeUsers * (INCLUDE_LEARNING ? 1 + assumeLearning : 1) + probe
      : null;
    console.log(JSON.stringify({
      probeReads: probe, projectedReads: projected,
      hint: "pass --assume-users N [--assume-learning-per-user M] for arithmetic, or run --apply and read the manifest",
    }));
    return;
  }

  // APPLY
  const outDir = opt("--out", `backups/${new Date().toISOString().replace(/[:.]/g, "-")}`);
  if (!outDir.startsWith("backups/")) {
    console.error("[export] Refusing: output must stay under backups/ (git-ignored).");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = { startedAt: new Date().toISOString(), collections: {}, reads: 0 };

  let cols = [...TOP_COLLECTIONS];
  if (RESUME_AFTER) {
    const [rc] = RESUME_AFTER.split("/");
    cols = cols.slice(cols.indexOf(rc) + 1);
    manifest.resumedAfter = RESUME_AFTER;
  }

  for (const col of cols) {
    let docs = [];
    let last = RESUME_AFTER && RESUME_AFTER.startsWith(`${col}/`) ? RESUME_AFTER.split("/")[1] : null;
    for (;;) {
      let q = db.collection(col).orderBy("__name__").limit(PAGE);
      if (col === "users" && LIMIT_USERS > 0) q = db.collection(col).orderBy("__name__").limit(Math.min(PAGE, LIMIT_USERS));
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      manifest.reads += snap.size;
      if (snap.empty) break;
      for (const d of snap.docs) docs.push({ id: d.id, data: d.data() });
      last = snap.docs[snap.docs.length - 1].id;
      if (snap.size < PAGE) break;
      if (col === "users" && LIMIT_USERS > 0 && docs.length >= LIMIT_USERS) break;
      await new Promise((r) => setTimeout(r, 200)); // quota-aware pause
    }
    fs.writeFileSync(path.join(outDir, `${col}.json`), JSON.stringify(docs));
    manifest.collections[col] = docs.length;
    console.log(JSON.stringify({ exported: col, documents: docs.length, readsSoFar: manifest.reads }));
  }

  if (INCLUDE_LEARNING) {
    const usersFile = path.join(outDir, "users.json");
    const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    let n = 0;
    for (const u of users) {
      for (const sub of LEARNING_SUBS) {
        const snap = await db.collection("users").doc(u.id).collection(sub).get();
        manifest.reads += snap.size;
        if (snap.size > 0) {
          fs.mkdirSync(path.join(outDir, "users", u.id), { recursive: true });
          fs.writeFileSync(
            path.join(outDir, "users", u.id, `${sub}.json`),
            JSON.stringify(snap.docs.map((d) => ({ id: d.id, data: d.data() }))),
          );
          n += snap.size;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    manifest.learningDocs = n;
    console.log(JSON.stringify({ exportedLearningDocs: n, readsSoFar: manifest.reads }));
  }

  manifest.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ done: true, outDir, reads: manifest.reads, collections: manifest.collections }));
}

main().catch((e) => { console.error("[export] FAILED:", e.message); process.exit(1); });
