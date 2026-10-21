import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Regression test for Issue 3: Forge subjects filtered out.
 *
 * Root cause: `fetchForgeSubjects` filtered subjects with `item.forge`,
 * excluding legacy subject documents that predate the `forge: true` field
 * (where `forge` is `undefined`). Changed predicate to `item.forge !== false`
 * so legacy subjects (forge undefined) are included while explicitly
 * non-forge subjects (forge: false) remain excluded.
 *
 * Ownership/visibility/access-control filters are NOT removed — only the
 * presence check on the `forge` field is relaxed.
 */
function filterForgeSubjects(rawSubjects) {
  return rawSubjects.filter((item) => item.forge !== false);
}

describe("Forge subject filter regression (Issue 3)", () => {
  it("includes forge:true subjects", () => {
    const raw = [{ id: "s1", forge: true, title: "Forge Subject" }];
    const result = filterForgeSubjects(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "s1");
  });

  it("includes legacy subjects without forge field (undefined)", () => {
    const raw = [{ id: "s2", title: "Legacy Subject" }];
    const result = filterForgeSubjects(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "s2");
  });

  it("includes legacy subjects with forge: null", () => {
    const raw = [{ id: "s3", forge: null, title: "Null Forge Subject" }];
    const result = filterForgeSubjects(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "s3");
  });

  it("excludes explicitly forge:false subjects", () => {
    const raw = [{ id: "s4", forge: false, title: "Non-Forge Subject" }];
    const result = filterForgeSubjects(raw);
    assert.equal(result.length, 0);
  });

  it("mixed list: includes forge:true and legacy, excludes forge:false", () => {
    const raw = [
      { id: "s1", forge: true, title: "Forge" },
      { id: "s2", title: "Legacy" },
      { id: "s3", forge: false, title: "Non-Forge" },
    ];
    const result = filterForgeSubjects(raw);
    assert.equal(result.length, 2);
    assert.equal(result.map((s) => s.id).sort().join(","), "s1,s2");
  });
});
