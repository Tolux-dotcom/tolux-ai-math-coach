import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_HEARTBEAT_SECONDS,
  TRIAL_SECONDS,
  advanceTrial,
  buildTrialStatus,
  normalizeHeartbeatSeconds
} from "../trial-access.mjs";

test("trial starts with ten cumulative minutes", () => {
  assert.deepEqual(buildTrialStatus(0), {
    isSubscriber: false,
    trialSecondsUsed: 0,
    trialSecondsRemaining: TRIAL_SECONDS,
    trialExpired: false
  });
});

test("heartbeat increments are capped server-side", () => {
  assert.equal(normalizeHeartbeatSeconds(999), MAX_HEARTBEAT_SECONDS);
  assert.equal(advanceTrial(590, 30).trialSecondsUsed, 600);
  assert.equal(advanceTrial(590, 30).trialExpired, true);
});

test("subscribers are never expired or charged", () => {
  const status = advanceTrial(600, 30, true);
  assert.equal(status.isSubscriber, true);
  assert.equal(status.trialExpired, false);
  assert.equal(status.trialSecondsRemaining, null);
  assert.equal(status.trialSecondsUsed, 600);
});
