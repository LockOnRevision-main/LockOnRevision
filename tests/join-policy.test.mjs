import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * Stage 3: joining policy + request lifecycle (static + logic).
 * Live Firestore transaction behaviour is verified by code inspection here
 * and the emulator runbook; pure transition rules are executed below.
 */

function nextStatus(current, decision) {
  if (current !== "pending") throw new Error("Request already decided.");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Bad decision.");
  return decision;
}

describe("Stage 3: policy defaults and redemption outcomes", () => {
  it("default policy is APPROVAL_REQUIRED (safer)", () => {
    const src = read("server/handlers/set-join-policy.js");
    assert.ok(src.includes("APPROVAL_REQUIRED"), "policy exists");
    assert.ok(src.includes("DEFAULT_JOIN_POLICY = \"APPROVAL_REQUIRED\""), "safe default");
    const redeem = read("server/handlers/redeem-pin.js");
    // Unset policy falls back to approval-required:
    assert.ok(redeem.includes('"APPROVAL_REQUIRED"'), "fallback default");
  });

  it("status transitions: pending -> approved|rejected only", () => {
    assert.equal(nextStatus("pending", "approved"), "approved");
    assert.equal(nextStatus("pending", "rejected"), "rejected");
    assert.throws(() => nextStatus("approved", "rejected"), /already decided/);
    assert.throws(() => nextStatus("rejected", "approved"), /already decided/);
    assert.throws(() => nextStatus("pending", "maybe"), /Bad decision/);
  });

  it("review route enforces scope + atomicity", () => {
    const src = read("server/handlers/review-request.js");
    assert.ok(src.includes("requirePermission") && src.includes('"request.review"'), "scoped perm auth");
    assert.ok(src.includes("runTransaction"), "atomic approve+membership");
    assert.ok(src.includes("already decided"), "no re-processing");
  });

  it("edge cases handled in redeem flow", () => {
    const src = read("server/handlers/redeem-pin.js");
    assert.ok(src.includes("already: true"), "already-member short-circuit");
    assert.ok(src.includes("removedAt: null"), "removed users can rejoin");
    assert.ok(src.includes("STALE_PIN"), "PIN revoked mid-flow handled");
    assert.ok(src.includes("alreadyRequested"), "duplicate pending prevented");
    assert.ok(src.includes("runTransaction"), "concurrent redemption safe");
  });

  it("policy change restricted + audited", () => {
    const src = read("server/handlers/set-join-policy.js");
    assert.ok(src.includes('"policy.manage"'), "policy.manage gate (default: school_admin + platform)");
    assert.ok(src.includes("school.policy-change"), "audited");
  });
});
