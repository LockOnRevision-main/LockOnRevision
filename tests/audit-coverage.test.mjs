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
  "server/handlers/create-pin.js",
  "server/handlers/revoke-pin.js",
  "server/handlers/redeem-pin.js",
  "server/handlers/set-join-policy.js",
  "server/handlers/review-request.js",
  "server/handlers/provision-school.js",
  "server/handlers/revoke-school-admin.js",
  "server/handlers/manage-membership.js",
  "server/handlers/manage-classroom.js",
  "server/handlers/enroll-academy.js",
  "server/handlers/create-invitation.js",
  "server/handlers/resend-invitation.js",
  "server/handlers/revoke-invitation.js",
  "server/handlers/accept-invitation.js",
  "server/handlers/set-permissions.js",
];

const READ_ONLY_ROUTES = [
  "server/handlers/search-students.js",
  "server/handlers/student-profile.js",
  "server/handlers/school-overview.js",
  "server/handlers/list-invitations.js",
  "server/handlers/get-permissions.js",
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
      // Stage 0.2 (shared writer) + Stage 0.3 (atomic via ref/data):
      assert.ok(/audit(Ref|Data)?\s*\(/.test(src), `${f} MUST use shared audit writer`);
      assert.ok(
        src.includes('from "./_lib/schoolServer.js"') || src.includes('from "../lib/schoolServer.js"'),
        `${f} MUST use the shared audit writer (no parallel logic)`,
      );
    });
  }

  it("no generic recursive-wildcard fallback under users (zero-segment hole)", () => {
    // Strip // comments (the explanatory note names the pattern) then assert
    // no live recursive-wildcard match remains: ** matches zero segments,
    // so a generic fallback would also match the user doc itself.
    const rules = read("firestore.rules").replace(/\/\/.*$/gm, "");
    assert.ok(!rules.includes("**"), "fallback removed");
    for (const col of ["subjects", "units", "subUnits", "lessons", "questions",
      "answers", "exerciseAnswers", "files", "forgeSources", "timetables",
      "timetableDocuments", "timetableMetadata", "timetableMetadataHistory",
      "mastery", "sessions", "dailyChallenge", "dailyChallengeHistory"]) {
      assert.ok(rules.includes(`match /${col}/{docId}`), `explicit block for ${col}`);
    }
  });

describe("Stage 0.3: audits commit atomically with the change", () => {
  for (const f of SENSITIVE_ROUTES) {
    it(`${f}: audit inside tx/batch, never standalone`, () => {
      const src = read(f);
      // No standalone post-write audit: a crash must not leave a change
      // without its record (or the reverse).
      assert.ok(!/await audit\(db/.test(src), `${f}: no standalone audit() call`);
      assert.ok(src.includes("auditData("), `${f}: builds audit entries`);
      assert.ok(
        src.includes("tx.set(") || src.includes("batch.set("),
        `${f}: audit committed via tx.set/batch.set`,
      );
    });
  }

  it("retry safety: tx-internal audit refs are pre-created or deterministic", () => {
    // auditRef() outside the tx function, or deterministic doc ids inside —
    // never auditRef() inside the tx body (retries would duplicate).
    for (const f of ["server/handlers/create-pin.js", "server/handlers/redeem-pin.js", "server/handlers/review-request.js", "server/handlers/accept-invitation.js"]) {
      const src = read(f);
      const bodies = src.split("runTransaction(async (tx)");
      assert.ok(bodies.length >= 2, `${f}: has transaction`);
      for (const body of bodies.slice(1)) {
        const fnBody = body.slice(0, body.indexOf("});") + 3);
        assert.ok(!fnBody.includes("auditRef(db)"), `${f}: no fresh auditRef inside tx body`);
      }
    }
  });

  it("documented exception: multi-batch scripts audit after (with ids)", () => {
    // migrate-academy / backfill span many batches; atomicity across all is
    // impossible — they record createdIds in one trailing audit entry.
    for (const f of ["scripts/migrate-academy.mjs", "scripts/backfill-users-public.mjs"]) {
      const src = read(f);
      assert.ok(src.includes("adminAuditLogs") && src.includes("createdIds"), `${f}: trailing audit with ids`);
    }
  });
});
  it("pin rotation revocations are audited, not silent", () => {
    const src = read("server/handlers/create-pin.js");
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
