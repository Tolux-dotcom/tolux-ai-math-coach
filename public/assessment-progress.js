(() => {
  const SUPABASE_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';
  const PENDING_KEY_PREFIX = 'toluxTestPrepPendingProgress:v2:';
  const LOCAL_PREFIX = 'toluxTestPrepProgress:';
  const MODE_MODULES = {
    quick: 'test-prep-quick-check',
    half: 'test-prep-half-test',
    full: 'test-prep-full-simulation'
  };

  function masteryLabel(percent) {
    if (percent >= 80) return 'Mastered';
    if (percent >= 60) return 'Developing';
    return 'Intervention Needed';
  }

  function safeStorage() {
    try {
      return window.localStorage || null;
    } catch {
      return null;
    }
  }

  function pendingKey(ownerId) {
    const normalized = String(ownerId || '').trim();
    return normalized ? `${PENDING_KEY_PREFIX}${encodeURIComponent(normalized)}` : null;
  }

  function readPending(ownerId, storage = safeStorage()) {
    if (!storage) return [];
    const key = pendingKey(ownerId);
    if (!key) return [];
    try {
      const parsed = JSON.parse(storage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writePending(ownerId, reports, storage = safeStorage()) {
    if (!storage) return;
    const key = pendingKey(ownerId);
    if (!key) return;
    try {
      storage.setItem(key, JSON.stringify(reports));
    } catch {}
  }

  function queuePending(ownerId, report, storage = safeStorage()) {
    const pending = readPending(ownerId, storage).filter(
      item => item?.completion_id !== report.completion_id
    );
    pending.push(report);
    writePending(ownerId, pending.slice(-20), storage);
  }

  function removePending(ownerId, completionId, storage = safeStorage()) {
    writePending(
      ownerId,
      readPending(ownerId, storage).filter(item => item?.completion_id !== completionId),
      storage
    );
  }

  function getClient() {
    try {
      if (!window.supabase?.createClient) return null;
      return window.__toluxTestPrepSupabase || (window.__toluxTestPrepSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      ));
    } catch {
      return null;
    }
  }

  function buildReport({
    modeId,
    percent,
    itemRecords,
    startedAt,
    completedAt = new Date(),
    completionId = window.crypto?.randomUUID?.()
  }) {
    const moduleId = MODE_MODULES[modeId];
    if (!moduleId) throw new Error('Unknown Test Prep mode.');
    if (!completionId) throw new Error('A secure completion ID is required.');
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      throw new Error('Test Prep percent is invalid.');
    }
    if (!Array.isArray(itemRecords) || !itemRecords.length || itemRecords.length > 100) {
      throw new Error('Test Prep item records are invalid.');
    }

    const completedTime = new Date(completedAt);
    if (Number.isNaN(completedTime.getTime())) {
      throw new Error('Test Prep completion time is invalid.');
    }

    const startTime = Number(startedAt);
    const elapsedSeconds = Number.isFinite(startTime)
      ? Math.max(0, Math.min(7 * 24 * 60 * 60, Math.round((completedTime.getTime() - startTime) / 1000)))
      : 0;

    return {
      completion_id: completionId,
      module_id: moduleId,
      completed_at: completedTime.toISOString(),
      mastery_label: masteryLabel(percent),
      mastery_score: percent,
      time_on_skill_seconds: elapsedSeconds,
      item_records: itemRecords.map(record => ({
        item_id: String(record.item_id || '').trim(),
        attempt_count: 1,
        first_attempt_correct: Boolean(record.first_attempt_correct),
        hint_count: 0,
        first_error_tag: record.first_attempt_correct
          ? null
          : String(record.first_error_tag || 'test-prep-missed').trim().slice(0, 80)
      }))
    };
  }

  async function sessionForSave(client) {
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) return null;
      return data?.session || null;
    } catch {
      return null;
    }
  }

  async function postReport(report, session, client, fetchImpl = window.fetch.bind(window)) {
    let activeSession = session;
    let response = await fetchImpl('/api/lesson-progress', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeSession.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report)
    });

    if (response.status === 401 && client?.auth?.refreshSession) {
      const { data, error } = await client.auth.refreshSession();
      activeSession = error ? null : data?.session;
      if (activeSession?.access_token) {
        response = await fetchImpl('/api/lesson-progress', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
      }
    }

    return response;
  }

  async function save(input, dependencies = {}) {
    const storage = dependencies.storage ?? safeStorage();
    const client = dependencies.client ?? getClient();
    const fetchImpl = dependencies.fetchImpl ?? window.fetch.bind(window);
    const report = buildReport(input);

    try {
      storage?.setItem(`${LOCAL_PREFIX}${report.completion_id}`, JSON.stringify(report));
    } catch {}

    const session = await sessionForSave(client);
    const ownerId = String(session?.user?.id || '').trim();
    if (!session?.access_token || !ownerId) {
      return { status: 'local-only', report };
    }

    try {
      const response = await postReport(report, session, client, fetchImpl);
      if (!response.ok) throw new Error(`Progress save failed with ${response.status}.`);
      removePending(ownerId, report.completion_id, storage);
      return { status: 'synced', report };
    } catch (error) {
      queuePending(ownerId, report, storage);
      return { status: 'queued', report, error };
    }
  }

  async function flushPending(dependencies = {}) {
    const storage = dependencies.storage ?? safeStorage();
    const client = dependencies.client ?? getClient();
    const fetchImpl = dependencies.fetchImpl ?? window.fetch.bind(window);
    const session = await sessionForSave(client);
    const ownerId = String(session?.user?.id || '').trim();
    if (!session?.access_token || !ownerId) {
      return { status: 'signed-out', synced: 0 };
    }

    const pending = readPending(ownerId, storage);
    if (!pending.length) return { status: 'empty', synced: 0 };

    let synced = 0;
    for (const report of pending) {
      try {
        const response = await postReport(report, session, client, fetchImpl);
        if (!response.ok) break;
        removePending(ownerId, report.completion_id, storage);
        synced += 1;
      } catch {
        break;
      }
    }
    return { status: synced === pending.length ? 'synced' : 'partial', synced };
  }

  window.toluxTestPrepProgress = {
    buildReport,
    flushPending,
    readPending,
    save
  };

  flushPending().catch(() => {});
})();
