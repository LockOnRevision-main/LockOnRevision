import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * Stage 0.2: audit-coverage enforcement. Any sensitive route that performs a
 * Firestore write MUST call the shared audit writer. This test FAILS if a
 * write path is added without an audit entry. Read-only routes are listed
 * explicitly and must contain NO writes.
 */
const SENSITIVE_ROUTES = [
  "api/create-pin.js",
  "api/revoke-pin.js",
  "api/redeem-pin.js",
  "api/set-join-policy.js",
  "api/review-request.js",
  "api/provision-school.js",
  "api/revoke-school-admin.js",
  "api/manage-membership.js",
  "api/enroll-academy.js",
  "api/create-invitation.js",
  "api/resend-invitation.js",
  "api/revoke-invitation.js",
  "api/accept-invitation.js",
  "api/set-permissions.js",
];

const READ_ONLY_ROUTES = [
  "api/search-students.js",
  "api/student-profile.js",
  "api/school-overview.js",
  "api/list-invitations.js",
  "api/get-permissions.js",
];

const WRITE_SIGNALS = [
  ".set(", ".update(", ".create(", ".delete(", ".add(",
  "batch.commit()", "runTransaction(",
];

function hasWrite(src) {
  return WRITE_SIGNALS.some((s) => src.includes(s));
}

describe("Stage 0.2: every sensitive write is audited", () => {
  for (const f of SENSITIVE_ROUTES) {
    it(`${f} writes + audits`, () => {
      const src = read(f);
      assert.ok(hasWrite(src), `${f} expected to write (or file missing?)`);
      assert.ok(/audit\s*\(/.test(src), `${f} MUST call audit()`);
      assert.ok(
        src.includes('from "./_lib/schoolServer.js"'),
        `${f} MUST use the shared audit writer (no parallel logic)`,
      );
    });
  }

  it("pin rotation revocations are audited, not silent", () => {
    const src = read("api/create-pin.js");
    assert.ok(src.includes("pin.revoke"), "rotation revocation audited");
  });

  for (const f of READ_ONLY_ROUTES) {
    it(`${f} performs no writes`, () => {
      let src;
      try {
        src = read(f);
      } catch {
        // Route may not exist in earlier stages — fail only if it exists.
        return;
      }
      assert.ok(!hasWrite(src), `${f} must stay read-only`);
    });
  }
});
