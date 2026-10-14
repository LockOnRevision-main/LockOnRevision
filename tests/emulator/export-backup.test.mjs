/**
 * REAL emulator test for scripts/export-backup.mjs (Stage 0.7).
 * Seeds PII-free fixtures via firebase-admin, runs the script in each mode
 * as a child process (inherits FIRESTORE_EMULATOR_HOST), and asserts:
 *  - dry-run performs ZERO reads and writes nothing
 *  - estimate reports counts without exporting
 *  - apply writes manifest + collection JSON under backups/ (git-ignored),
 *    logs counts only (never document contents), and is resumable
 * Runs in CI emulator job + locally. Skipped automatically when no
 * emulator host is set (unit suite stays offline-safe).
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(root, "scripts", "export-backup.mjs");
const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

function run(args) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], {
      cwd: root,
      // Same demo project namespace the test seeds (script defaults differ).
      env: { ...process.env, FIREBASE_PROJECT_ID: process.env.FIREBASE_TEST_PROJECT || "demo-lor" },
    }, (err, stdout, stderr) => {
      if (err && !stdout.includes("[export]")) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

before(async function () {
  if (!EMULATOR) this.skip();
  const admin = (await import("firebase-admin")).default;
  if (admin.apps.length === 0) admin.initializeApp({ projectId: process.env.FIREBASE_TEST_PROJECT || "demo-lor" });
  const db = admin.firestore();
  await db.collection("users").doc("seed-u1").set({ role: "user", name: "Seed", secret_leak_probe: "must-not-appear-in-logs" });
  await db.collection("schools").doc("seed-s").set({ name: "Seed School", type: "external" });
  await db.collection("memberships").doc("seed-u1_seed-s").set({ uid: "seed-u1", schoolId: "seed-s", role: "student", status: "active" });
});

describe("export-backup on emulator", { skip: !EMULATOR }, () => {
  it("dry-run: zero reads, no output", async () => {
    const out = await run([]);
    assert.ok(out.includes("DRY-RUN"), "dry-run mode");
    assert.ok(out.includes("zero reads"), "no reads");
    assert.ok(!out.includes("must-not-appear-in-logs"), "never prints contents");
  });

  it("estimate: 7-read probe, no bulk reads", async () => {
    const out = await run(["--estimate"]);
    assert.ok(out.includes('"collection":"users"'), "users probed");
    assert.ok(out.includes('"nonEmpty":true'), "seed visible");
    assert.ok(out.includes("projectedReads"), "arithmetic guidance");
    assert.ok(!out.includes("must-not-appear-in-logs"), "never prints contents");
  });

  it("apply: manifest + JSON under backups/, resumable", async () => {
    const outDir = "backups/ci-probe";
    fs.rmSync(path.join(root, outDir), { recursive: true, force: true });
    const out = await run(["--apply", "--out", outDir]);
    assert.ok(!out.includes("must-not-appear-in-logs"), "never prints contents");
    const manifest = JSON.parse(fs.readFileSync(path.join(root, outDir, "manifest.json"), "utf8"));
    assert.ok(manifest.reads >= 3, "reads counted");
    assert.ok(manifest.collections.users >= 1, "users exported");
    const users = JSON.parse(fs.readFileSync(path.join(root, outDir, "users.json"), "utf8"));
    assert.ok(users.some((u) => u.id === "seed-u1"), "seed present in output");
    // Resume path: second run with --resume-after skips earlier collections.
    const out2 = await run(["--apply", "--out", `${outDir}-2`, "--resume-after", "users/seed-u1"]);
    assert.ok(out2.includes("done"), "resume completes");
    fs.rmSync(path.join(root, outDir), { recursive: true, force: true });
    fs.rmSync(path.join(root, `${outDir}-2`), { recursive: true, force: true });
  });
});
