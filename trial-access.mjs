export const TRIAL_SECONDS = 600;
export const MAX_HEARTBEAT_SECONDS = 30;

export function normalizeTrialSeconds(value) {
  return Math.max(0, Math.min(TRIAL_SECONDS, Math.floor(Number(value) || 0)));
}

export function normalizeHeartbeatSeconds(value) {
  return Math.max(
    0,
    Math.min(MAX_HEARTBEAT_SECONDS, Math.floor(Number(value) || 0))
  );
}

export function buildTrialStatus(secondsUsed, isSubscriber = false) {
  const trialSecondsUsed = normalizeTrialSeconds(secondsUsed);
  return {
    isSubscriber: Boolean(isSubscriber),
    trialSecondsUsed,
    trialSecondsRemaining: isSubscriber
      ? null
      : Math.max(0, TRIAL_SECONDS - trialSecondsUsed),
    trialExpired: !isSubscriber && trialSecondsUsed >= TRIAL_SECONDS
  };
}

export function advanceTrial(secondsUsed, heartbeatSeconds, isSubscriber = false) {
  const status = buildTrialStatus(secondsUsed, isSubscriber);
  if (status.isSubscriber || status.trialExpired) return status;

  return buildTrialStatus(
    status.trialSecondsUsed + normalizeHeartbeatSeconds(heartbeatSeconds),
    false
  );
}
