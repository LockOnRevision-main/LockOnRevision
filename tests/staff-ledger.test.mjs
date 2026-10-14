import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  writeStaffRecords, findStaffDrift, staffLedgerId, membershipId,
} from "../server/lib/schoolServer.js";

/**
 * Stage 0.4: membership (source of truth) + staffAssignments ledger stay
 * consistent through one shared helper. In-memory Firestore mock.
 */
function makeMockDb() {
  const store = new Map(); // "col/id" -> data
  const coll = (name) => ({
    doc: (id) => ({ __ref: `${name}/${id}` }),
    where: (f, _op, v) => {
      const filters = [{ f, v }];
      const q = {
        where: (f2, _o2, v2) => { filters.push({ f: f2, v: v2 }); return q; },
        get: async () => {
          const docs = [];
          for (const [k, d] of store) {
            if (!k.startsWith(`${name}/`)) continue;
            if (filters.every(({ f, v }) => d[f] === v)) {
              docs.push({ id: k.slice(name.length + 1), data: () => ({ ...d }), ref: { __ref: k } });
            }
          }
          return { docs, forEach: (cb) => docs.forEach(cb) };
        },
      };
      return q;
    },
  });
  const applySet = (ref, data, opts) => {
    const cur = store.get(ref.__ref) || {};
    store.set(ref.__ref, opts?.merge ? { ...cur, ...data } : { ...data });
  };
  const applyUpdate = (ref, data) => {
    const cur = store.get(ref.__ref);
    // Firestore update on missing doc fails — mirror that.
    if (!cur) { const e = new Error("not-found"); e.code = 5; throw e; }
    store.set(ref.__ref, { ...cur, ...data });
  };
  return {
    store,
    collection: coll,
    batch: () => {
      const ops = [];
      return {
        set: (r, d, o) => ops.push(() => applySet(r, d, o)),
        update: (r, d) => ops.push(() => applyUpdate(r, d)),
        commit: async () => { ops.forEach((fn) => fn()); },
      };
    },
  };
}

async function runHelper(db, args) {
  const b = db.batch();
  await writeStaffRecords(db, b, { now: "2026-01-01T00:00:00.000Z", ...args });
  await b.commit();
}

describe("Stage 0.4: shared membership+ledger writer", () => {
  it("provision creates membership + ledger row together", async () => {
    const db = makeMockDb();
    await runHelper(db, { uid: "u1", schoolId: "s", role: "school_admin", status: "active" });
    assert.deepEqual(db.store.get("memberships/u1_s"), {
      uid: "u1", schoolId: "s", role: "school_admin", status: "active",
      classroomId: null, updatedAt: "2026-01-01T00:00:00.000Z",
      removedAt: null, removedBy: null,
    });
    assert.equal(db.store.get(`staffAssignments/${staffLedgerId("u1", "s", "school_admin")}`).status, "active");
    assert.deepEqual(await findStaffDrift(db, "s"), [], "no drift after provision");
  });

  it("deactivation flips both, preserves history (no deletes)", async () => {
    const db = makeMockDb();
    await runHelper(db, { uid: "u1", schoolId: "s", role: "teacher", status: "active" });
    await runHelper(db, { uid: "u1", schoolId: "s", role: "teacher", status: "removed", removedBy: "boss" });
    assert.equal(db.store.get("memberships/u1_s").status, "removed");
    assert.equal(db.store.get("memberships/u1_s").removedBy, "boss");
    assert.equal(db.store.get(`staffAssignments/${staffLedgerId("u1", "s", "teacher")}`).status, "removed");
    assert.ok(db.store.has("memberships/u1_s"), "profile-side record kept");
  });

  it("role change supersedes old ledger row, activates new one", async () => {
    const db = makeMockDb();
    await runHelper(db, { uid: "u1", schoolId: "s", role: "teacher", status: "active" });
    await runHelper(db, { uid: "u1", schoolId: "s", role: "coordinator", status: "active" });
    assert.equal(db.store.get("memberships/u1_s").role, "coordinator");
    assert.equal(db.store.get(`staffAssignments/${staffLedgerId("u1", "s", "teacher")}`).status, "superseded");
    assert.equal(db.store.get(`staffAssignments/${staffLedgerId("u1", "s", "coordinator")}`).status, "active");
    assert.deepEqual(await findStaffDrift(db, "s"), [], "no drift after role change");
  });

  it("overrides + scopes land on the membership (source of truth)", async () => {
    const db = makeMockDb();
    await runHelper(db, {
      uid: "u1", schoolId: "s", role: "teacher", status: "active",
      permissionSet: { grants: ["pin.generate"], denies: [] }, accessScopes: ["c1"],
    });
    const m = db.store.get("memberships/u1_s");
    assert.deepEqual(m.permissionSet, { grants: ["pin.generate"], denies: [] });
    assert.deepEqual(m.accessScopes, ["c1"]);
  });

  it("drift detector: missing / duplicate / mismatch / students ignored", async () => {
    const db = makeMockDb();
    // Active staff membership with NO ledger row:
    db.store.set("memberships/a_s", { uid: "a", schoolId: "s", role: "teacher", status: "active", classroomId: null });
    // Two active ledger rows for one membership:
    db.store.set("memberships/b_s", { uid: "b", schoolId: "s", role: "teacher", status: "active", classroomId: null });
    db.store.set("staffAssignments/b_s_teacher", { uid: "b", schoolId: "s", role: "teacher", status: "active", classroomId: null });
    db.store.set("staffAssignments/b_s_teacher2", { uid: "b", schoolId: "s", role: "teacher", status: "active", classroomId: null });
    // Classroom mismatch:
    db.store.set("memberships/c_s", { uid: "c", schoolId: "s", role: "teacher", status: "active", classroomId: "c1" });
    db.store.set("staffAssignments/c_s_teacher", { uid: "c", schoolId: "s", role: "teacher", status: "active", classroomId: "c2" });
    // Student without ledger: fine.
    db.store.set("memberships/d_s", { uid: "d", schoolId: "s", role: "student", status: "active", classroomId: null });
    // Removed staff without ledger: fine.
    db.store.set("memberships/e_s", { uid: "e", schoolId: "s", role: "teacher", status: "removed", classroomId: null });
    const drift = await findStaffDrift(db, "s");
    const kinds = drift.map((x) => `${x.uid}:${x.kind}`).sort();
    assert.deepEqual(kinds, ["a:ledger-missing", "b:ledger-duplicate", "c:classroom-mismatch"]);
  });

  it("routes use the helper (no divergent writers)", async () => {
    const fs = await import("node:fs");
    for (const f of ["server/handlers/provision-school.js", "server/handlers/accept-invitation.js", "server/handlers/revoke-school-admin.js", "server/handlers/set-permissions.js", "server/handlers/assign-staff.js"]) {
      const src = fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      assert.ok(src.includes("writeStaffRecords"), `${f} uses shared helper`);
    }
    assert.equal(membershipId("u", "s"), "u_s", "deterministic ids");
  });
});
