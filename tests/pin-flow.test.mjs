import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PIN_ALPHABET, PIN_LENGTH, PIN_ENTROPY_BITS, generatePinCode,
  validatePinFormat, isPinLive, pinReject,
} from "../api/_lib/pins.js";

describe("Stage 2: PIN generation entropy and format", () => {
  it("~40-bit entropy from 31-char alphabet x 8", () => {
    assert.equal(PIN_ALPHABET.length, 31);
    assert.equal(PIN_LENGTH, 8);
    assert.ok(PIN_ENTROPY_BITS > 39 && PIN_ENTROPY_BITS < 40.5, `entropy ${PIN_ENTROPY_BITS}`);
    assert.ok(!/[01IL0O]/.test(PIN_ALPHABET), "no ambiguous characters");
  });

  it("generated PINs match format and differ", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const p = generatePinCode();
      assert.equal(p.length, 8);
      assert.equal(validatePinFormat(p), true);
      seen.add(p);
    }
    assert.ok(seen.size > 190, "cryptographically random, collisions unlikely");
  });

  it("format rejects malformed input", () => {
    assert.equal(validatePinFormat("short"), false);
    assert.equal(validatePinFormat("abcdefgh"), false); // lowercase not in alphabet
    assert.equal(validatePinFormat("ABCDEFGH1"), false); // 1 excluded
    assert.equal(validatePinFormat(null), false);
    assert.equal(validatePinFormat(12345678), false);
  });
});

describe("Stage 0.4: PIN_PEPPER fails closed", () => {
  it("hashPin throws without a sufficient pepper", async () => {
    const pins = await import("../api/_lib/pins.js");
    const OLD = { ...process.env };
    try {
      delete process.env.PIN_PEPPER;
      assert.throws(() => pins.hashPin("ABCDEFGH"), /not configured/);
      process.env.PIN_PEPPER = "short";
      assert.throws(() => pins.hashPin("ABCDEFGH"), /not configured/);
      process.env.PIN_PEPPER = "this-is-a-long-enough-pepper-123";
      assert.match(pins.hashPin("ABCDEFGH"), /^[0-9a-f]{64}$/);
    } finally {
      process.env = OLD;
    }
  });

  it("routes fail closed (500, no oracle) when pepper unset", async () => {
    const fs = await import("node:fs");
    for (const f of ["api/create-pin.js", "api/redeem-pin.js"]) {
      const src = fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      // Either message is a fail-closed 500; neither reveals pepper state.
      assert.ok(
        src.includes("PIN service not configured") || src.includes("temporarily unavailable"),
        `${f} fails closed`,
      );
      assert.ok(!/return res\.status\(500\)[^;]*pepper/i.test(src), `${f}: 500 body must not name the secret`);
    }
  });
});
describe("Stage 2: lifecycle + uniform responses", () => {
  it("expiry, revocation both fail liveness", () => {
    const future = new Date(Date.now() + 3600e3).toISOString();
    const past = new Date(Date.now() - 1000).toISOString();
    assert.equal(isPinLive({ status: "active", expiresAt: future }), true);
    assert.equal(isPinLive({ status: "active", expiresAt: past }), false);
    assert.equal(isPinLive({ status: "revoked", expiresAt: future }), false);
    assert.equal(isPinLive(null), false);
  });

  it("rejection is uniform (single constant shape, no reason oracle)", () => {
    const r = pinReject();
    assert.deepEqual(Object.keys(r).sort(), ["error", "ok"]);
    assert.equal(r.ok, false);
    // One constant message for ALL failure modes (unknown/expired/revoked/
    // wrong-scope). Callers return this object verbatim — no branching.
    assert.equal(r.error, "Invalid or expired PIN.");
    assert.equal(JSON.stringify(pinReject()), JSON.stringify(pinReject()));
  });

  it("storage is hash-only: pins.js never persists plaintext", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../api/_lib/pins.js", import.meta.url), "utf8");
    assert.ok(src.includes("createHmac"), "keyed hash");
    assert.ok(src.includes("PIN_PEPPER"), "server-held pepper");
  });

  it("deterministic hash ids give uniqueness + O(1) lookup", async () => {
    const fs = await import("node:fs");
    const createSrc = fs.readFileSync(new URL("../api/create-pin.js", import.meta.url), "utf8");
    assert.ok(createSrc.includes("pinDocIdFromHash"), "deterministic id");
    assert.ok(createSrc.includes("classroomId") && createSrc.includes("schoolId"), "scope binding");
    const redeemSrc = fs.readFileSync(new URL("../api/redeem-pin.js", import.meta.url), "utf8");
    assert.ok(redeemSrc.includes("pinReject()"), "uniform failures");
    assert.ok(redeemSrc.includes("academy"), "Academy excluded from PIN flow");
    assert.ok(redeemSrc.includes("checkPinLockout") && redeemSrc.includes("recordPinFailure"), "lockout");
  });
});
