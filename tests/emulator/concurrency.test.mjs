/**
 * REAL emulator concurrency tests (Stage 0.3 + Stage 1) — run in CI/local via
 * `firebase emulators:exec --only firestore "npm run test:emulator"`.
 * Uses firebase-admin (server SDK, bypasses rules like production Admin SDK
 * paths do) because the Web SDK's Transaction.get() does not support
 * queries — the product routes run on firebase-admin, so the proof must too.
 * Proves serializable-transaction semantics on REAL Firestore:
 *  - two concurrent same-scope PIN rotations → exactly one live PIN
 *  - two concurrent invitation acceptances → exactly one winner
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import admin from "firebase-admin";

const PROJECT_ID = process.env.FIREBASE_TEST_PROJECT || "demo-lor";
let testEnv;

let adminDbInstance = null;
function adminDb() {
  if (!adminDbInstance) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    adminDbInstance = admin.firestore();
    adminDbInstance.settings({ ignoreUndefinedProperties: true });
  }
  return adminDbInstance;
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((a) => a.delete())).catch(() => {});
});

describe("REAL EMULATOR: rotation serializes", () => {
  it("concurrent rotations leave exactly one live PIN", async () => {
    const db = adminDb();
    await db.collection("joiningPins").doc("pin_old").set({
      schoolId: "s", classroomId: null, status: "active",
    });
    async function rotate(newId) {
      await db.runTransaction(async (tx) => {
        const prev = await tx.get(
          db.collection("joiningPins").where("schoolId", "==", "s").where("status", "==", "active"),
        );
        prev.forEach((d) => {
          if (d.id !== newId) tx.update(d.ref, { status: "revoked" });
        });
        tx.create(db.collection("joiningPins").doc(newId), { schoolId: "s", status: "active" });
      });
    }
    await Promise.all([rotate("pin_n1"), rotate("pin_n2")]);
    const live = await db.collection("joiningPins")
      .where("schoolId", "==", "s").where("status", "==", "active").get();
    assert.equal(live.size, 1, "exactly one live PIN on real Firestore");
  });

  it("concurrent invitation acceptance has exactly one winner", async () => {
    const db = adminDb();
    await db.collection("adminInvitations").doc("inv_1").set({
      schoolId: "s", emailLower: "boss@example.com", role: "school_admin",
      status: "pending",
    });
    async function accept(who) {
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(db.collection("adminInvitations").doc("inv_1"));
        if (snap.data()?.status !== "pending") throw new Error("taken");
        tx.update(db.collection("adminInvitations").doc("inv_1"), { status: "used", usedBy: who });
        tx.set(db.doc(`memberships/${who}_s`), { uid: who, schoolId: "s", status: "active" });
        return who;
      });
    }
    const results = await Promise.allSettled([accept("u1"), accept("u2")]);
    const winners = results.filter((r) => r.status === "fulfilled");
    assert.equal(winners.length, 1, "single-use holds under concurrency");
    const inv = await db.collection("adminInvitations").doc("inv_1").get();
    assert.equal(inv.data().status, "used");
  });
});
