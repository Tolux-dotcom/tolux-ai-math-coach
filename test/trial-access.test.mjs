import test from "node:test";
import assert from "node:assert/strict";
import { TRIAL_SECONDS, normalizeTrialAccess, addActiveTrialSeconds } from "../trial-access.mjs";

test("trial is exactly ten active minutes", () => {
  assert.equal(TRIAL_SECONDS, 600);
});

test("new free student receives the full trial", () => {
  const access = normalizeTrialAccess({ is_subscriber: false, trial_seconds_used: 0 });
  assert.equal(access.trialSecondsRemaining, 600);
  assert.equal(access.trialExpired, false);
});

test("active time accumulates across sessions", () => {
  const first = addActiveTrialSeconds({ is_subscriber: false, trial_seconds_used: 120 }, 180);
  assert.equal(first.trialSecondsUsed, 300);
  assert.equal(first.trialSecondsRemaining, 300);
});

test("trial stops at ten minutes", () => {
  const access = addActiveTrialSeconds({ is_subscriber: false, trial_seconds_used: 590 }, 30);
  assert.equal(access.trialSecondsUsed, 600);
  assert.equal(access.trialSecondsRemaining, 0);
  assert.equal(access.trialExpired, true);
});

test("subscriber is never trial locked", () => {
  const access = normalizeTrialAccess({ is_subscriber: true, trial_seconds_used: 600 });
  assert.equal(access.trialExpired, false);
  assert.equal(access.trialSecondsRemaining, null);
});
