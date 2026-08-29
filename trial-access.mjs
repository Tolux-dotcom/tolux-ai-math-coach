export const TRIAL_SECONDS = 600;

export function normalizeTrialAccess(row = {}) {
  const used = Math.max(0, Math.min(TRIAL_SECONDS, Number(row.trial_seconds_used) || 0));
  const isSubscriber = Boolean(row.is_subscriber);
  return {
    isSubscriber,
    trialSecondsUsed: used,
    trialSecondsRemaining: isSubscriber ? null : Math.max(0, TRIAL_SECONDS - used),
    trialExpired: !isSubscriber && used >= TRIAL_SECONDS
  };
}

export function addActiveTrialSeconds(row, seconds) {
  const current = normalizeTrialAccess(row);
  if (current.isSubscriber || current.trialExpired) return current;
  const increment = Math.max(0, Math.floor(Number(seconds) || 0));
  return normalizeTrialAccess({
    is_subscriber: false,
    trial_seconds_used: Math.min(TRIAL_SECONDS, current.trialSecondsUsed + increment)
  });
}
