#!/usr/bin/env node
/**
 * Beta 1.9 Prompt 44 — Stage B: secure platform-admin bootstrap & recovery.
 *
 * Usage (project owner / operator ONLY, with service credentials):
 *   node scripts/admin-bootstrap.mjs --uid <FIREBASE_UID> [--dry-run]
 *   node scripts/admin-bootstrap.mjs --email <EMAIL> [--dry-run]
 *
 * Requires env (never commit secrets):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Behaviour:
 *  - Default is DRY-RUN (no writes). Writes require --apply.
 *  - Verifies the target Auth user exists (by UID or email lookup).
 *  - Sets users/{uid} { isAdmin: true, role: 'admin' } via Admin SDK merge.
 *  - Appends adminAuditLogs { actorUid:'operator', action:'admin.bootstrap', ... }.
 *  - Never reachable from any public endpoint or client write.
 *  - Existing admins are never demoted by this script.
 *
 * Recovery: same command re-grants a locked-out owner. Keep service-account
 * credentials offline; see docs/ADMIN_RECOVERY.md (no secrets in repo).
 */

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function opt(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const uidOpt = opt("--uid");
const emailOpt = opt("--email");
const apply = flag("--apply");

if (!uidOpt && !emailOpt) {
  console.error("Usage: node scripts/admin-bootstrap.mjs --uid <UID> | --email <EMAIL> [--apply]");
  console.error("Default is dry-run. Add --apply to write.");
  process.exit(2);
}

async function main() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey && privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error("[bootstrap] Missing service credentials env (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY). Refusing to run.");
    process.exit(1);
  }
  if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore();
  const auth = getAuth();

  let uid = uidOpt;
  if (!uid && emailOpt) {
    const user = await auth.getUserByEmail(emailOpt);
    uid = user.uid;
  } else if (uid) {
    await auth.getUser(uid); // throws if unknown — fail closed
  }
  console.log(JSON.stringify({ bootstrap: "lookup", uid, dryRun: !apply }));

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const before = snap.exists ? { isAdmin: snap.data().isAdmin || false, role: snap.data().role || null } : null;
  console.log(JSON.stringify({ bootstrap: "before", uid, profileExists: snap.exists, before }));

  if (!apply) {
    console.log("[bootstrap] DRY-RUN: no writes. Re-run with --apply to grant admin.");
    return;
  }

  await ref.set({ isAdmin: true, role: "admin", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("adminAuditLogs").add({
    actorUid: "operator",
    action: "admin.bootstrap",
    targetUid: uid,
    scope: "platform",
    createdAt: new Date().toISOString(),
    note: "operator bootstrap/recovery grant",
  });
  console.log(JSON.stringify({ bootstrap: "applied", uid, isAdmin: true, role: "admin" }));
}

main().catch((e) => { console.error("[bootstrap] FAILED:", e.message); process.exit(1); });
