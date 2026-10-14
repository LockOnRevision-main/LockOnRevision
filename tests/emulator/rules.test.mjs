/**
 * REAL emulator rules tests (Stage 0.1) — these exercise the actual
 * firestore.rules / storage.rules text against the Firebase emulator.
 * A mirror-test pass means nothing if the rules file is wrong; THESE tests
 * are the proof. Run: npm run test:emulator (see docs/EMULATOR_TESTS.md).
 * In CI: .github/workflows/ci.yml job `emulator-tests` (Java 17).
 *
 * Env (set by `firebase emulators:exec` or manually):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
 */
import { describe, it, before, after } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_ID = process.env.FIREBASE_TEST_PROJECT || "demo-lor";

let testEnv;

async function seedAdmin(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

function authed(uid) {
  return testEnv.authenticatedContext(uid, { email: `${uid}@example.com` });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(root, "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  await testEnv.clearFirestore();

  await seedAdmin(async (db) => {
    const { doc, setDoc } = await import("firebase/firestore");
    // Users
    await setDoc(doc(db, "users/platform-1"), { role: "admin", isAdmin: true, name: "Owner", xp: 0, energy: 0, totalScore: 0 });
    await setDoc(doc(db, "users/stu-a"), { role: "user", name: "Stu A", xp: 10, energy: 1, totalScore: 110 });
    await setDoc(doc(db, "users/stu-b"), { role: "user", name: "Stu B", xp: 5, energy: 0, totalScore: 5 });
    // Public projection
    await setDoc(doc(db, "users_public/stu-a"), { name: "Stu A", totalScore: 110 });
    // Schools + memberships
    await setDoc(doc(db, "schools/school-a"), { name: "School A", type: "external", joinPolicy: "APPROVAL_REQUIRED" });
    await setDoc(doc(db, "schools/school-b"), { name: "School B", type: "external", joinPolicy: "APPROVAL_REQUIRED" });
    await setDoc(doc(db, "memberships/stu-a_school-a"), { uid: "stu-a", schoolId: "school-a", role: "student", status: "active" });
    await setDoc(doc(db, "memberships/adm-a_school-a"), { uid: "adm-a", schoolId: "school-a", role: "school_admin", status: "active" });
    await setDoc(doc(db, "memberships/adm-b_school-b"), { uid: "adm-b", schoolId: "school-b", role: "school_admin", status: "active" });
    await setDoc(doc(db, "classrooms/cls-a1"), { schoolId: "school-a", name: "Class 1" });
    await setDoc(doc(db, "classrooms/cls-b1"), { schoolId: "school-b", name: "Class 1" });
    await setDoc(doc(db, "adminAuditLogs/seed-1"), { actorUid: "platform-1", action: "seed", createdAt: new Date().toISOString() });
    await setDoc(doc(db, "joiningPins/pin_x"), { codeHash: "x", schoolId: "school-a", status: "active" });
    await setDoc(doc(db, "joinRequests/req_x"), { uid: "stu-a", schoolId: "school-a", status: "pending" });
    await setDoc(doc(db, "adminInvitations/inv_x"), { schoolId: "school-a", status: "pending" });
    await setDoc(doc(db, "pinAttempts/stu-a"), { count: 1 });
  });
});

after(async () => {
  await testEnv?.cleanup();
});

describe("REAL RULES: user profiles (A2/A3)", () => {
  it("anon cannot read any profile", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const { doc, getDoc } = await import("firebase/firestore");
    await assertFails(getDoc(doc(db, "users/stu-a")));
  });

  it("user reads own profile, not another's", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("stu-a").firestore(), "users/stu-a")));
    await assertFails(getDoc(doc(authed("stu-a").firestore(), "users/stu-b")));
  });

  it("platform admin reads any profile", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("platform-1").firestore(), "users/stu-b")));
  });

  it("role escalation denied: cannot set role admin / isAdmin on self", async () => {
    const { doc, updateDoc } = await import("firebase/firestore");
    await assertFails(updateDoc(doc(authed("stu-a").firestore(), "users/stu-a"), { role: "admin" }));
    await assertFails(updateDoc(doc(authed("stu-a").firestore(), "users/stu-a"), { isAdmin: true }));
    await assertFails(updateDoc(doc(authed("stu-a").firestore(), "users/stu-a"), { schoolRoles: ["x"] }));
  });

  it("owner may update own display name", async () => {
    const { doc, updateDoc } = await import("firebase/firestore");
    await assertSucceeds(updateDoc(doc(authed("stu-a").firestore(), "users/stu-a"), { name: "Stu A2" }));
  });

  it("fallback hole closed: owner subcollections work, cross-user denied", async () => {
    const { doc, setDoc, getDoc } = await import("firebase/firestore");
    // Owner writes to own subcollections (explicit blocks, incl. dailyChallenge):
    await assertSucceeds(setDoc(doc(authed("stu-a").firestore(), "users/stu-a/subjects/s1"), { title: "Maths" }));
    await assertSucceeds(setDoc(doc(authed("stu-a").firestore(), "users/stu-a/dailyChallengeHistory/h1"), { score: 5 }));
    // Cross-user subcollection access denied:
    await assertFails(getDoc(doc(authed("stu-a").firestore(), "users/stu-b/subjects/s1")));
    await assertFails(setDoc(doc(authed("stu-a").firestore(), "users/stu-b/subjects/s1"), { title: "X" }));
    // Unlisted future subcollections deny by default (fail-closed):
    await assertFails(setDoc(doc(authed("stu-a").firestore(), "users/stu-a/futureCollection/d1"), { x: 1 }));
  });
});

describe("REAL RULES: public projection", () => {
  it("signed-in reads users_public; anon denied", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("stu-b").firestore(), "users_public/stu-a")));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users_public/stu-a")));
  });

  it("projection rejects email/admin fields", async () => {
    const { doc, setDoc } = await import("firebase/firestore");
    await assertFails(setDoc(doc(authed("stu-b").firestore(), "users_public/stu-b"), { name: "X", email: "x@y.z" }));
    await assertFails(setDoc(doc(authed("stu-b").firestore(), "users_public/stu-b"), { name: "X", role: "admin" }));
  });
});

describe("REAL RULES: cross-school isolation", () => {
  it("member reads own school; non-member denied", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("adm-a").firestore(), "schools/school-a")));
    await assertFails(getDoc(doc(authed("adm-a").firestore(), "schools/school-b")));
    await assertFails(getDoc(doc(authed("adm-b").firestore(), "schools/school-a")));
  });

  it("classroom reads scoped to member school", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("adm-a").firestore(), "classrooms/cls-a1")));
    await assertFails(getDoc(doc(authed("adm-a").firestore(), "classrooms/cls-b1")));
  });

  it("membership reads: owner or same-school staff only", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("stu-a").firestore(), "memberships/stu-a_school-a")));
    await assertSucceeds(getDoc(doc(authed("adm-a").firestore(), "memberships/stu-a_school-a")));
    await assertFails(getDoc(doc(authed("adm-b").firestore(), "memberships/stu-a_school-a")));
  });

  it("platform admin reads across schools", async () => {
    const { doc, getDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("platform-1").firestore(), "schools/school-b")));
    await assertSucceeds(getDoc(doc(authed("platform-1").firestore(), "memberships/stu-a_school-a")));
  });
});

describe("REAL RULES: permission overrides are server-only (Stage 2)", () => {
  it("school_admin cannot self-grant via direct membership write", async () => {
    const { doc, updateDoc } = await import("firebase/firestore");
    const db = authed("adm-a").firestore();
    await assertFails(updateDoc(doc(db, "memberships/adm-a_school-a"), {
      permissionSet: { grants: ["invite.manage"], denies: [] },
    }));
    await assertFails(updateDoc(doc(db, "memberships/adm-a_school-a"), {
      accessScopes: ["cls-a1"],
    }));
  });

  it("school_admin may still update classroom assignment directly", async () => {
    const { doc, updateDoc } = await import("firebase/firestore");
    await assertSucceeds(updateDoc(
      doc(authed("adm-a").firestore(), "memberships/stu-a_school-a"),
      { classroomId: "cls-a1" },
    ));
  });
});
describe("REAL RULES: server-only collections", () => {
  it("audit logs: admin reads, no client writes", async () => {
    const { doc, getDoc, setDoc, updateDoc, deleteDoc } = await import("firebase/firestore");
    await assertSucceeds(getDoc(doc(authed("platform-1").firestore(), "adminAuditLogs/seed-1")));
    await assertFails(getDoc(doc(authed("adm-a").firestore(), "adminAuditLogs/seed-1")));
    await assertFails(setDoc(doc(authed("platform-1").firestore(), "adminAuditLogs/evil"), { action: "x" }));
    await assertFails(updateDoc(doc(authed("platform-1").firestore(), "adminAuditLogs/seed-1"), { action: "y" }));
    await assertFails(deleteDoc(doc(authed("platform-1").firestore(), "adminAuditLogs/seed-1")));
  });

  it("joiningPins/joinRequests/adminInvitations/pinAttempts deny all clients", async () => {
    const { doc, getDoc, setDoc } = await import("firebase/firestore");
    for (const [col, id] of [["joiningPins", "pin_x"], ["joinRequests", "req_x"], ["adminInvitations", "inv_x"], ["pinAttempts", "stu-a"]]) {
      await assertFails(getDoc(doc(authed("platform-1").firestore(), `${col}/${id}`)), `${col} read denied even for admin`);
      await assertFails(setDoc(doc(authed("platform-1").firestore(), `${col}/${id}`), { status: "x" }), `${col} write denied even for admin`);
    }
  });
});
