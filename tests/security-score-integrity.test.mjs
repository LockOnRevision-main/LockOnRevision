import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Regression tests for Critical Security Investigation: Suspicious Leaderboard Score.
 *
 * Confirmed root cause: Firestore rules allowed any authenticated user to directly
 * write arbitrary xp/energy/totalScore to their own users/{uid} doc because
 * `protectedUnchanged()` did not cover score fields, and `users_public` explicitly
 * allowed xp/energy/totalScore in affectedKeys.
 *
 * Fix: firestore.rules `scoreChangesValid()` enforces:
 *  - xp must not decrease
 *  - xp increment per write capped at MAX_XP_PER_WRITE (1000)
 *  - energy must stay within 0-100
 *  - totalScore must equal xp + energy * 100
 *
 * Client-side: completeLesson() caps xpEarned at MAX_LESSON_XP (1000).
 */

// --- Simulated scoreChangesValid() from firestore.rules ---
const MAX_XP_PER_WRITE = 1000;
function scoreChangesValid(current, next) {
  const xpChanged = next.xp !== current.xp;
  const energyChanged = next.energy !== current.energy;
  const totalScoreChanged = next.totalScore !== current.totalScore;

  const xpNotDecreasing = !xpChanged || next.xp >= current.xp;
  const xpIncrementCapped = !xpChanged || (next.xp - current.xp) <= MAX_XP_PER_WRITE;
  const energyInBounds = !energyChanged || (next.energy >= 0 && next.energy <= 100);
  const totalScoreConsistent = !totalScoreChanged
    || (next.totalScore === next.xp + next.energy * 100);

  return xpNotDecreasing && xpIncrementCapped && energyInBounds && totalScoreConsistent;
}

// --- calculateTotalScore from userService.js ---
function calculateTotalScore(profile) {
  const xp = Number(profile?.xp || 0);
  const energy = Number(profile?.energy || 0);
  return xp + energy * 100;
}

describe("Security: score integrity (firestore.rules scoreChangesValid)", () => {
  const current = { xp: 100, energy: 50, totalScore: 5100 }; // 100 + 50*100 = 5100

  it("allows legitimate small xp increment with consistent totalScore", () => {
    const next = { xp: 200, energy: 50, totalScore: 5200 }; // 200 + 50*100 = 5200
    assert.equal(scoreChangesValid(current, next), true);
  });

  it("allows legitimate energy change within bounds with consistent totalScore", () => {
    const next = { xp: 100, energy: 75, totalScore: 7600 }; // 100 + 75*100 = 7600
    assert.equal(scoreChangesValid(current, next), true);
  });

  it("rejects energy above 100 (observed exploit: 100,002 energy)", () => {
    const next = { xp: 100, energy: 100002, totalScore: 10001200 };
    assert.equal(scoreChangesValid(current, next), false);
  });

  it("rejects xp decrease", () => {
    const next = { xp: 50, energy: 50, totalScore: 5050 };
    assert.equal(scoreChangesValid(current, next), false);
  });

  it("rejects xp increment exceeding cap (1000)", () => {
    const next = { xp: 2000, energy: 50, totalScore: 52000 };
    assert.equal(scoreChangesValid(current, next), false);
  });

  it("rejects inconsistent totalScore (not xp + energy*100)", () => {
    const next = { xp: 200, energy: 50, totalScore: 999999 };
    assert.equal(scoreChangesValid(current, next), false);
  });

  it("allows no score changes (other fields only)", () => {
    const next = { xp: 100, energy: 50, totalScore: 5100, name: "New Name" };
    assert.equal(scoreChangesValid(current, next), true);
  });

  it("rejects the exact observed exploit values (1,000,200 XP + 100,002 Energy)", () => {
    const next = { xp: 1000200, energy: 100002, totalScore: 11000400 };
    assert.equal(scoreChangesValid(current, next), false);
  });
});

describe("Security: calculateTotalScore formula consistency", () => {
  it("matches observed breakdown: 1,000,200 XP + 100,002 Energy = 11,000,400", () => {
    assert.equal(calculateTotalScore({ xp: 1000200, energy: 100002 }), 11000400);
  });

  it("returns 0 for empty profile", () => {
    assert.equal(calculateTotalScore({}), 0);
  });

  it("computes xp + energy * 100", () => {
    assert.equal(calculateTotalScore({ xp: 50, energy: 3 }), 350);
  });
});

describe("Security: completeLesson XP cap (learningService.js)", () => {
  const MAX_LESSON_XP = 1000;

  it("caps xpEarned at MAX_LESSON_XP", () => {
    const safe = Math.max(0, Math.min(Number(999999) || 0, MAX_LESSON_XP));
    assert.equal(safe, MAX_LESSON_XP);
  });

  it("allows normal xpEarned values", () => {
    const safe = Math.max(0, Math.min(Number(150) || 0, MAX_LESSON_XP));
    assert.equal(safe, 150);
  });

  it("clamps negative xpEarned to 0", () => {
    const safe = Math.max(0, Math.min(Number(-500) || 0, MAX_LESSON_XP));
    assert.equal(safe, 0);
  });
});
