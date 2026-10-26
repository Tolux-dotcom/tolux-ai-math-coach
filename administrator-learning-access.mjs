import {buildTrialStatus} from './trial-access.mjs';

// Use only server-managed administrator IDs. Never trust client roles or email.
export function createAdministratorLearningAccess({client, userIds = ''} = {}) {
  const configuredIds = new Set(String(userIds).split(',').map(id=>id.trim()).filter(Boolean));
  return {
    async isAdministrator(userId) {
      if (!userId || typeof userId !== 'string') return false;
      if (configuredIds.has(userId)) return true;
      if (!client) return false;
      try {
        const {data, error} = await client.from('growth_admins')
          .select('user_id').eq('user_id', userId).maybeSingle();
        if (error) return false;
        return data?.user_id === userId;
      } catch { return false; }
    }
  };
}

export function hasUnlimitedLearningAccess(usage) {
  return usage?.is_subscriber === true || usage?.is_administrator === true;
}

export function buildLearningTrialStatus(secondsUsed, usage) {
  const status = buildTrialStatus(secondsUsed, usage?.is_subscriber === true);
  if (usage?.is_administrator !== true) return {...status, isAdministrator:false};
  return {...status, isAdministrator:true, trialSecondsRemaining:null, trialExpired:false};
}
