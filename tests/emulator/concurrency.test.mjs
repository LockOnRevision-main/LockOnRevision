/**
 * REAL emulator concurrency tests (Stage 0.3 + Stage 1) — run in CI via
 * `firebase emulators:exec --only firestore "npm run test:emulator"`.
 * Proves serializable-transaction semantics on REAL Firestore:
 *  - two concurrent same-scope PIN rotations → exactly one live PIN
 *  - two concurrent invitation acceptances → exactly one winner
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = process.env.FIREBASE_TEST_PROJECT || "demo-lor";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv?.cleanup();
});

describe("REAL EMULATOR: rotation serializes", () => {
  it("concurrent rotations leave exactly one live PIN", async () => {
    const { doc, runTransaction, getDocs, query, collection, where } = await import("firebase/firestore");
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "joiningPins/pin_old"), { schoolId: "s", classroomId: null, status: "active" });
    });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      async function rotate(newId) {
        await runTransaction(db, async (tx) => {
          const q = query(
            collection(db, "joiningPins"),
            where("schoolId", "==", "s"),
            where("status", "==", "active"),
          );
          const prev = await tx.get(q);
          prev.forEach((d) => {
            if (d.id !== newId) tx.update(d.ref, { status: "revoked" });
          });
          // tx.create equivalent: guarded set via read-your-write check
          const existing = await tx.get(doc(db, "joiningPins", newId));
          if (existing.exists()) throw new Error("collision");
          tx.set(doc(db, "joiningPins", newId), { schoolId: "s", status: "active" });
        });
      }
      await Promise.all([rotate("pin_n1"), rotate("pin_n2")]);
      const live = await getDocs(query(
        collection(db, "joiningPins"),
        where("schoolId", "==", "s"),
        where("status", "==", "active"),
      ));
      assert.equal(live.size, 1, "exactly one live PIN on real Firestore");
    });
  });

  it("concurrent invitation acceptance has exactly one winner", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const { doc, setDoc, runTransaction, getDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "adminInvitations/inv_1"), {
        schoolId: "s", emailLower: "boss@example.com", role: "school_admin",
        status: "pending",
      });
      async function accept(who) {
        return runTransaction(db, async (tx) => {
          const snap = await tx.get(doc(db, "adminInvitations/inv_1"));
          if (snap.data()?.status !== "pending") throw new Error("taken");
          tx.update(doc(db, "adminInvitations/inv_1"), { status: "used", usedBy: who });
          tx.set(doc(db, `memberships/${who}_s`), { uid: who, schoolId: "s", status: "active" });
          return who;
        });
      }
      const results = await Promise.allSettled([accept("u1"), accept("u2")]);
      const winners = results.filter((r) => r.status === "fulfilled");
      assert.equal(winners.length, 1, "single-use holds under concurrency");
      const inv = await getDoc(doc(db, "adminInvitations/inv_1"));
      assert.equal(inv.data().status, "used");
    });
  });
});
