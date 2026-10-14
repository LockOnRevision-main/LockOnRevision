import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateInviteToken, hashInviteToken, inviteDocIdFromHash,
  isInviteLive, inviteReject, normaliseEmail, validEmail,
} from "../api/_lib/invites.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Stage 1: token design", () => {
  it("256-bit entropy, URL-safe, unique", () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      const t = generateInviteToken();
      assert.equal(t.length, 43, "32 bytes base64url");
      assert.match(t, /^[A-Za-z0-9_-]{43}$/);
      seen.add(t);
    }
    assert.equal(seen.size, 100);
  });

  it("hash-only storage with server pepper, deterministic ids", () => {
    const OLD = { ...process.env };
    try {
      delete process.env.INVITE_PEPPER;
      assert.throws(() => hashInviteToken("x".repeat(43)), /not configured/);
      process.env.INVITE_PEPPER = "long-enough-invite-pepper-123";
      const h = hashInviteToken("x".repeat(43));
      assert.match(h, /^[0-9a-f]{64}$/);
      assert.equal(inviteDocIdFromHash(h), inviteDocIdFromHash(h));
      assert.ok(inviteDocIdFromHash(h).startsWith("inv_"));
    } finally {
      process.env = OLD;
    }
  });

  it("uniform rejection for all token failure modes", () => {
    assert.deepEqual(inviteReject(), { ok: false, error: "Invalid or expired invitation." });
    assert.equal(JSON.stringify(inviteReject()), JSON.stringify(inviteReject()));
  });

  it("liveness: pending+unexpired only", () => {
    const future = new Date(Date.now() + 3600e3).toISOString();
    const past = new Date(Date.now() - 1000).toISOString();
    assert.equal(isInviteLive({ status: "pending", expiresAt: future }), true);
    for (const d of [
      { status: "pending", expiresAt: past },
      { status: "used", expiresAt: future },
      { status: "revoked", expiresAt: future },
      null,
    ]) assert.equal(isInviteLive(d), false);
  });

  it("email normalisation + validation", () => {
    assert.equal(normaliseEmail("  Boss@Example.COM "), "boss@example.com");
    assert.equal(validEmail("boss@example.com"), true);
    assert.equal(validEmail("not-an-email"), false);
    assert.equal(validEmail(""), false);
  });
});

describe("Stage 1: lifecycle + binding + atomicity (route contracts)", () => {
  it("create: platform-only, fixed role, audited, copy-link fallback", () => {
    const src = read("api/create-invitation.js");
    assert.ok(src.includes("Platform admin required"), "platform-only");
    assert.ok(src.includes('role: "school_admin"'), "fixed role binding");
    assert.ok(src.includes("invite.create"), "audited");
    assert.ok(src.includes("acceptUrl") && src.includes("emailFallback"), "copy-link fallback");
    assert.ok(!/console\.log\([^)]*(token|email)/i.test(src), "no secret logging");
  });

  it("resend invalidates old token, audits both", () => {
    const src = read("api/resend-invitation.js");
    assert.ok(src.includes('status: "revoked"'), "old token revoked");
    assert.ok(src.includes("invite.revoke") && src.includes("invite.create"), "both audited");
    assert.ok(src.includes("already used"), "used invites cannot resend");
  });

  it("accept: verified-email binding, single-use transaction, uniform failures", () => {
    const src = read("api/accept-invitation.js");
    assert.ok(src.includes("email_verified"), "verified-email check");
    assert.ok(src.includes("emailLower"), "invited-address binding");
    assert.ok(src.includes("runTransaction"), "atomic mark-used + membership");
    assert.ok(src.includes('"STALE"'), "concurrent second accept loses uniformly");
    assert.ok(src.includes("inviteReject()"), "uniform failures");
    assert.ok(src.includes("checkInviteLockout") && src.includes("recordInviteFailure"), "lockout");
    assert.ok(src.includes("invite.accept"), "audited");
  });

  it("school admins cannot invite (safer default)", () => {
    for (const f of ["api/create-invitation.js", "api/resend-invitation.js", "api/revoke-invitation.js", "api/list-invitations.js"]) {
      const src = read(f);
      assert.ok(src.includes("isPlatformAdmin"), `${f}: platform gate`);
      assert.ok(!src.includes("requireSchoolStaff"), `${f}: no school-staff path`);
    }
  });

  it("email delivery: Resend free tier, fail-soft, secrets in env only", () => {
    const src = read("api/_lib/email.js");
    assert.ok(src.includes("api.resend.com/emails"), "Resend REST");
    assert.ok(src.includes("RESEND_API_KEY") && src.includes("INVITE_FROM_EMAIL"), "env-only creds");
    assert.ok(src.includes("email-not-configured"), "copy-link fallback when unconfigured");
  });

  it("invitation collections stay server-only in rules", () => {
    const rules = read("firestore.rules");
    for (const col of ["match /adminInvitations/", "match /inviteAttempts/"]) {
      assert.ok(rules.includes(col), `${col} covered`);
    }
    const i = rules.indexOf("match /adminInvitations/");
    assert.ok(rules.slice(i, i + 200).includes("allow read: if false"));
  });
});
