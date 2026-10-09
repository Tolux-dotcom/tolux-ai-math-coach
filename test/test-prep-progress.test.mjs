import { DEFAULT_AUTH_CONFIG } from '../public-auth-config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  new URL('../public/assessment-progress.js', import.meta.url),
  'utf8'
);

function fixture({
  session = null,
  refreshedSession = {
    access_token: 'refreshed-token',
    user: { id: 'student-1' }
  },
  responses = [],
  storageData = new Map()
} = {}) {
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
        activeSession = refreshedSession;
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
    TOLUX_PUBLIC_CONFIG: DEFAULT_AUTH_CONFIG,
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
  const context = { window, document: { currentScript: { dataset: {} } }, Date, JSON, Map, Number, String, Boolean, Array, Error };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    api: window.toluxTestPrepProgress,
    client,
    fetch,
    requests,
    storage,
    storageData,
    setSession(value) {
      activeSession = value;
    }
  };
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

test('keeps signed-out Quick Check progress local without attributing it to a later account', async () => {
  const { api, requests, storageData, storage } = fixture();
  const outcome = await api.save({ ...baseInput, modeId: 'quick' });

  assert.equal(outcome.status, 'local-only');
  assert.equal(requests.length, 0);
  assert.ok(storageData.has(`toluxTestPrepProgress:${outcome.report.completion_id}`));
  assert.equal(api.readPending('student-1', storage).length, 0);
});

test('loads persistence before the unified assessment runner and exposes save status', () => {
  const html = fs.readFileSync(
    new URL('../public/test-prep.html', import.meta.url),
    'utf8'
  );
  const sharedIndex = html.indexOf('/assessment-progress.js');
  const accessIndex = html.indexOf('/subscriber-access-client.js');
  const runnerIndex = html.indexOf('/test-prep.js');

  assert.ok(sharedIndex > 0);
  assert.ok(sharedIndex < runnerIndex);
  assert.ok(accessIndex < runnerIndex);
  assert.doesNotMatch(html, /test-prep-full\.js/);
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

test('queues an owned result before the request settles and clears it only after success', async () => {
  const state = fixture({
    session: { access_token: 'student-1-token', user: { id: 'student-1' } }
  });
  let finishRequest;
  let requestStarted;
  const started = new Promise(resolve => { requestStarted = resolve; });
  const pending = state.api.save(baseInput, {
    fetchImpl: async () => {
      requestStarted();
      return new Promise(resolve => { finishRequest = resolve; });
    }
  });
  await started;
  const queued = state.api.readPending('student-1', state.storage);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].module_id, 'test-prep-half-test');
  assert.ok(state.storageData.has(`toluxTestPrepProgress:${queued[0].completion_id}`));
  finishRequest({ ok: true, status: 200 });
  assert.equal((await pending).status, 'synced');
  assert.equal(state.api.readPending('student-1', state.storage).length, 0);
  assert.ok(state.storageData.has(`toluxTestPrepProgress:${queued[0].completion_id}`));
});

test('a reloaded page replays an interrupted Quick Check only for its original owner', async () => {
  const state = fixture({
    session: { access_token: 'student-1-token', user: { id: 'student-1' } }
  });
  let requestStarted;
  const started = new Promise(resolve => { requestStarted = resolve; });
  // Simulate a request abandoned by navigation: its promise never settles.
  void state.api.save({ ...baseInput, modeId: 'quick' }, {
    fetchImpl: () => {
      requestStarted();
      return new Promise(() => {});
    }
  });
  await started;
  const report = state.api.readPending('student-1', state.storage)[0];
  assert.ok(report?.completion_id);

  const other = fixture({
    session: { access_token: 'student-2-token', user: { id: 'student-2' } },
    storageData: state.storageData
  });
  await other.api.flushPending();
  assert.equal(other.requests.length, 0);
  assert.equal(other.api.readPending('student-1', other.storage).length, 1);

  const original = fixture({
    session: { access_token: 'student-1-new-token', user: { id: 'student-1' } },
    storageData: state.storageData
  });
  // Automatic page-load replay is allowed to finish before assertions.
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(original.requests.length > 0);
  assert.equal(JSON.parse(original.requests[0].options.body).completion_id, report.completion_id);
  assert.equal(original.requests[0].options.headers.Authorization, 'Bearer student-1-new-token');
  assert.equal(original.api.readPending('student-1', original.storage).length, 0);
  assert.ok(original.storageData.has(`toluxTestPrepProgress:${report.completion_id}`));
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
  assert.equal(second.api.readPending('student-1', second.storage).length, 1);
});

test('never retries an owned result with a refreshed session from another account', async () => {
  const state = fixture({
    session: { access_token: 'student-1-expired', user: { id: 'student-1' } },
    refreshedSession: {
      access_token: 'student-2-token',
      user: { id: 'student-2' }
    },
    responses: [401]
  });

  const outcome = await state.api.save(baseInput);

  assert.equal(outcome.status, 'queued');
  assert.equal(state.requests.length, 1);
  assert.equal(
    state.requests[0].options.headers.Authorization,
    'Bearer student-1-expired'
  );
  assert.equal(state.api.readPending('student-1', state.storage).length, 1);
  assert.equal(state.api.readPending('student-2', state.storage).length, 0);
});

test('isolates failed-save replay by the signed-in Supabase user', async () => {
  const storageData = new Map();
  const fixtureState = fixture({
    session: { access_token: 'student-1-token', user: { id: 'student-1' } },
    responses: [503, 200],
    storageData
  });

  const queued = await fixtureState.api.save(baseInput);
  assert.equal(queued.status, 'queued');
  assert.equal(fixtureState.api.readPending('student-1', fixtureState.storage).length, 1);
  assert.equal(fixtureState.api.readPending('student-2', fixtureState.storage).length, 0);

  fixtureState.setSession({
    access_token: 'student-2-token',
    user: { id: 'student-2' }
  });
  const otherAccount = await fixtureState.api.flushPending({
    storage: fixtureState.storage,
    client: fixtureState.client,
    fetchImpl: fixtureState.fetch
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(otherAccount)),
    { status: 'empty', synced: 0 }
  );
  assert.equal(fixtureState.requests.length, 1);

  fixtureState.setSession({
    access_token: 'student-1-token',
    user: { id: 'student-1' }
  });
  const originalAccount = await fixtureState.api.flushPending({
    storage: fixtureState.storage,
    client: fixtureState.client,
    fetchImpl: fixtureState.fetch
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(originalAccount)),
    { status: 'synced', synced: 1 }
  );
  assert.equal(fixtureState.api.readPending('student-1', fixtureState.storage).length, 0);
});

test('dashboard replays an owned failed Quick Check before fetching account history', async () => {
  const state = fixture({
    session: { access_token: 'valid-token', user: { id: 'student-1' } },
    responses: [503, 200]
  });
  await state.api.save({ ...baseInput, modeId: 'quick' });
  const appSource = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const fn = appSource.slice(appSource.indexOf('async function refreshDashboardProgress('), appSource.indexOf('\nfunction updateDashboardActivity('));
  const calls = [];
  const context = {
    window: { toluxTestPrepProgress: state.api },
    supabaseClient: state.client,
    progressRefreshSequence: 0,
    syncPendingLessonProgress: async () => calls.push('lessons'),
    fetch: async () => {
      assert.equal(state.api.readPending('student-1', state.storage).length, 0);
      calls.push('history');
      return { ok: true, json: async () => ({ activities: [{ module_id: 'test-prep-quick-check', mastery_score: 76 }] }) };
    },
    renderDashboardProgress: (activities, source) => calls.push([source, activities[0].module_id]),
    renderDeviceOnlyTestPrep: (activities, accountAvailable) =>
      calls.push(['device', accountAvailable, activities.length]),
    console
  };
  vm.createContext(context);
  vm.runInContext(fn, context);
  await context.refreshDashboardProgress({ access_token: 'valid-token', user: { id: 'student-1' } });
  assert.deepEqual(calls, [
    'lessons',
    'history',
    ['account', 'test-prep-quick-check'],
    ['device', true, 1]
  ]);
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('/assessment-progress.js') < html.indexOf('/app.js'));
  assert.match(html, /assessment-progress.js" data-defer-replay="true"/);
});

function dashboardFixture({ session, replay = async () => {}, statuses = [200] }) {
  const state = fixture({ session });
  const appSource = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const fn = appSource.slice(appSource.indexOf('async function refreshDashboardProgress('), appSource.indexOf('\nfunction updateDashboardActivity('));
  const requests = [];
  const rendered = [];
  const context = {
    window: { toluxTestPrepProgress: { flushPending: () => replay(state) } },
    supabaseClient: state.client,
    progressRefreshSequence: 0,
    syncPendingLessonProgress: async () => {},
    fetch: async (url, options) => {
      requests.push(options.headers.Authorization);
      const status = statuses[requests.length - 1] ?? 200;
      return { status, ok: status === 200, json: async () => ({ activities: [{ module_id: 'test-prep-quick-check', mastery_score: 76 }] }) };
    },
    renderDashboardProgress: (activities, source) => rendered.push(source),
    renderDeviceOnlyTestPrep: () => {},
    readLocalLessonActivities: () => [],
    document: { querySelector: () => null },
    console: { error() {} }
  };
  vm.createContext(context);
  vm.runInContext(fn, context);
  return { context, state, requests, rendered };
}

test('dashboard uses the refreshed token after replay instead of hiding saved account history', async () => {
  const session = { access_token: 'expired-token', user: { id: 'student-1' } };
  const state = dashboardFixture({
    session,
    replay: async state => state.client.auth.refreshSession()
  });
  await state.context.refreshDashboardProgress(session);
  assert.deepEqual(state.requests, ['Bearer refreshed-token']);
  assert.deepEqual(state.rendered, ['account']);
});

test('dashboard retries an expired history token once and keeps server failures visible', async () => {
  const session = { access_token: 'expired-token', user: { id: 'student-1' } };
  const recovered = dashboardFixture({ session, statuses: [401, 200] });
  await recovered.context.refreshDashboardProgress(session);
  assert.deepEqual(recovered.requests, ['Bearer expired-token', 'Bearer refreshed-token']);
  assert.deepEqual(recovered.rendered, ['account']);
  const unavailable = dashboardFixture({ session, statuses: [401, 401] });
  await unavailable.context.refreshDashboardProgress(session);
  assert.equal(unavailable.requests.length, 2);
  assert.deepEqual(unavailable.rendered, ['local']);
});

test('dashboard never loads another account history after a session switch during replay', async () => {
  const session = { access_token: 'student-1-token', user: { id: 'student-1' } };
  const state = dashboardFixture({
    session,
    replay: async state => state.setSession({ access_token: 'student-2-token', user: { id: 'student-2' } })
  });
  await state.context.refreshDashboardProgress(session);
  assert.deepEqual(state.requests, []);
  assert.ok(!state.rendered.includes('account'));
});

test('signing out invalidates an in-flight dashboard refresh', async () => {
  const session = { access_token: 'student-1-token', user: { id: 'student-1' } };
  let release;
  const replay = new Promise(resolve => { release = resolve; });
  const state = dashboardFixture({ session, replay: () => replay });
  const pending = state.context.refreshDashboardProgress(session);
  state.state.setSession(null);
  await state.context.refreshDashboardProgress(null);
  release();
  await pending;
  assert.deepEqual(state.requests, []);
  assert.deepEqual(state.rendered, ['local']);
});

test('dashboard surfaces an unconfirmed device-only Test Prep result without attributing it to the account', () => {
  const appSource = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const start = appSource.indexOf('function readLocalTestPrepActivities(');
  const end = appSource.indexOf('\nfunction readPendingLessonProgress(', start);
  const functions = appSource.slice(start, end);
  const storageData = new Map([
    ['toluxTestPrepProgress:local-result', JSON.stringify({
      completion_id: '123e4567-e89b-42d3-a456-426614174001',
      module_id: 'test-prep-quick-check',
      completed_at: '2026-10-01T08:00:00.000Z',
      mastery_score: 82
    })]
  ]);
  const panel = {
    hidden: true,
    children: [],
    replaceChildren() { this.children = []; },
    append(...children) { this.children.push(...children); }
  };
  const document = {
    querySelector(selector) {
      return selector === '#deviceOnlyTestPrep' ? panel : null;
    },
    createElement(tagName) {
      return { tagName, textContent: '' };
    }
  };
  const localStorage = {
    get length() { return storageData.size; },
    key(index) { return [...storageData.keys()][index] || null; },
    getItem(key) { return storageData.get(key) || null; }
  };
  const context = {
    LOCAL_TEST_PREP_PREFIX: 'toluxTestPrepProgress:',
    localStorage,
    document,
    moduleTitle: () => 'Test Prep Quick Check',
    formatCompletionDate: () => 'Oct 1, 2026, 3:00 AM',
    Date,
    JSON,
    Number,
    String,
    Set,
    Array,
    console
  };
  vm.createContext(context);
  vm.runInContext(functions, context);

  context.renderDeviceOnlyTestPrep([], true);

  assert.equal(panel.hidden, false);
  assert.deepEqual(
    panel.children.map(child => child.textContent),
    [
      'Test Prep result saved on this device only',
      'Test Prep Quick Check • 82% • Oct 1, 2026, 3:00 AM',
      'This result is not confirmed in the signed-in account. Keep this browser’s data intact while Tolux attempts recovery.'
    ]
  );
  assert.match(
    fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'),
    /id="deviceOnlyTestPrep"[^>]+hidden/
  );
});
