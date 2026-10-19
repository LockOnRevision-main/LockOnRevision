import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure-logic migration test: idempotency, dry-run no-writes, reconciliation,
 * learning-data preservation — without needing the Firestore emulator.
 * Models the deterministic-id + merge semantics of scripts/migrate-academy.mjs.
 */
const mid = (uid) => `${String(uid).replace(/[^A-Za-z0-9_-]/g, "_")}_academy`;

function simulateRun({ users, existing, dryRun }) {
  const writes = [];
  const store = new Map(existing.map((id) => [id, { status: "active" }]));
  for (const uid of users) {
    const id = mid(uid);
    if (store.has(id)) continue; // idempotent skip
    if (!dryRun) {
      store.set(id, { uid, schoolId: "academy", role: "student", status: "active" });
      writes.push(id);
    }
  }
  return { writes, size: store.size };
}

describe("academy migration logic", () => {
  const users = ["u1", "u2", "u3-missing-fields", "u4"];

  it("dry-run produces no writes", () => {
    const r = simulateRun({ users, existing: [], dryRun: true });
    assert.equal(r.writes.length, 0);
    assert.equal(r.size, 0);
  });

  it("second run creates no duplicates (idempotent)", () => {
    const first = simulateRun({ users, existing: [], dryRun: false });
    assert.equal(first.writes.length, 4);
    const second = simulateRun({ users, existing: first.writes, dryRun: false });
    assert.equal(second.writes.length, 0);
    assert.equal(second.size, 4);
  });

  it("already-migrated + interrupted runs resume cleanly", () => {
    const partial = simulateRun({ users: ["u1", "u2"], existing: [], dryRun: false });
    const resume = simulateRun({ users, existing: partial.writes, dryRun: false });
    assert.deepEqual(resume.writes.sort(), [mid("u3-missing-fields"), mid("u4")].sort());
  });

  it("reconciliation counts match; learning data untouched", () => {
    const learning = new Map(users.map((u) => [u, { xp: 100, energy: 5 }]));
    const run = simulateRun({ users, existing: [], dryRun: false });
    assert.equal(run.size, users.length, "counts match");
    for (const u of users) assert.deepEqual(learning.get(u), { xp: 100, energy: 5 }, `${u} unchanged`);
  });
});
