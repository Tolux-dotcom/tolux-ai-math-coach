import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  new URL('../public/assessment-progress.js', import.meta.url),
  'utf8'
);

function fixture({ session = null, responses = [] } = {}) {
  const storageData = new Map();
  const requests = [];
  let responseIndex = 0;
  let activeSession = session;
  const storage = {
    getItem(key) {
      return storageData.get(key) || null;
    },
    setItem(key, value) {
      storageData.set(key, String(value));
    }
  };
  const client = {
    auth: {
      async getSession() {
        return { data: { session: activeSession }, error: null };
      },
      async refreshSession() {
        activeSession = {
          access_token: 'refreshed-token',
          user: { id: 'student-1' }
        };
        return { data: { session: activeSession }, error: null };
      }
    }
  };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const status = responses[responseIndex++] ?? 200;
    return { ok: status >= 200 && status < 300, status };
  };
  const window = {
    localStorage: storage,
    fetch,
    crypto: {
      randomUUID() {
        return '123e4567-e89b-42d3-a456-426614174000';
      }
    },
    supabase: {
      createClient() {
        return client;
      }
    }
  };
  const context = { window, Date, JSON, Map, Number, String, Boolean, Array, Error };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: window.toluxTestPrepProgress, client, fetch, requests, storage, storageData };
}

const baseInput = {
  modeId: 'half',
  percent: 76,
  startedAt: Date.parse('2026-09-18T12:00:00.000Z'),
  completedAt: new Date('2026-09-18T12:10:00.000Z'),
  itemRecords: [
    { item_id: 'ht1', first_attempt_correct: true, first_error_tag: null },
    { item_id: 'ht2', first_attempt_correct: false, first_error_tag: 'A.5A' }
  ]
};

test('builds a bounded lesson-progress report for a Test Prep session', () => {
  const { api } = fixture();
  const report = api.buildReport(baseInput);

  assert.equal(report.module_id, 'test-prep-half-test');
  assert.equal(report.mastery_label, 'Developing');
  assert.equal(report.mastery_score, 76);
  assert.equal(report.time_on_skill_seconds, 600);
  assert.deepEqual(
    JSON.parse(JSON.stringify(report.item_records)),
    [
      {
        item_id: 'ht1',
        attempt_count: 1,
        first_attempt_correct: true,
        hint_count: 0,
        first_error_tag: null
      },
      {
        item_id: 'ht2',
        attempt_count: 1,
        first_attempt_correct: false,
        hint_count: 0,
        first_error_tag: 'A.5A'
      }
    ]
  );
});

test('keeps signed-out Quick Check progress locally without calling the server', async () => {
  const { api, requests, storageData, storage } = fixture();
  const outcome = await api.save({ ...baseInput, modeId: 'quick' });

  assert.equal(outcome.status, 'local-only');
  assert.equal(requests.length, 0);
  assert.ok(storageData.has(`toluxTestPrepProgress:${outcome.report.completion_id}`));
  assert.equal(api.readPending(storage).length, 1);
});

test('loads persistence before either assessment runner and exposes save status', () => {
  const html = fs.readFileSync(
    new URL('../public/test-prep.html', import.meta.url),
    'utf8'
  );
  const sharedIndex = html.indexOf('/assessment-progress.js');
  const quickIndex = html.indexOf('/test-prep.js');
  const fullIndex = html.indexOf('/test-prep-full.js');

  assert.ok(sharedIndex > 0);
  assert.ok(sharedIndex < quickIndex);
  assert.ok(sharedIndex < fullIndex);
  assert.match(html, /id="testPrepSaveStatus"/);
});

test('saves signed-in progress through the authenticated server endpoint', async () => {
  const { api, requests } = fixture({
    session: { access_token: 'initial-token', user: { id: 'student-1' } }
  });
  const outcome = await api.save(baseInput);

  assert.equal(outcome.status, 'synced');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/lesson-progress');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer initial-token');
  assert.equal(JSON.parse(requests[0].options.body).module_id, 'test-prep-half-test');
});

test('refreshes once after 401 and queues a result after a later server failure', async () => {
  const first = fixture({
    session: { access_token: 'expired-token', user: { id: 'student-1' } },
    responses: [401, 200]
  });
  const refreshed = await first.api.save(baseInput);
  assert.equal(refreshed.status, 'synced');
  assert.equal(first.requests.length, 2);
  assert.equal(first.requests[1].options.headers.Authorization, 'Bearer refreshed-token');

  const second = fixture({
    session: { access_token: 'valid-token', user: { id: 'student-1' } },
    responses: [503]
  });
  const queued = await second.api.save(baseInput);
  assert.equal(queued.status, 'queued');
  assert.equal(second.api.readPending(second.storage).length, 1);
});
