import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeLessonProgressReport } from '../lesson-progress.mjs';
import { buildDiagnosticProgressReport } from '../public/diagnostic-progress.mjs';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('function readPendingLessonProgress('), app.indexOf('function renderDashboardProgress('));
const refreshSource = app.slice(app.indexOf('async function refreshDashboardProgress('), app.indexOf('function updateDashboardActivity('));
const localReader = app.slice(app.indexOf('function readLocalLessonActivities('), app.indexOf('function readLocalTestPrepActivities('));
const owner = { access_token: 'original-token', user: { id: 'cefac2b0-5c7c-46ca-bc63-58900aacb001' } };
const refreshedOwner = { ...owner, access_token: 'fresh-token' };
const other = { access_token: 'other-token', user: { id: 'cefac2b0-5c7c-46ca-bc63-58900aacb002' } };
const prefix = 'toluxPendingLessonProgress:';

function response(status = 200, data = { activity: { mastery_score: 80 } }) {
  return { status, ok: status >= 200 && status < 300, async json() { return data; } };
}

function fixture(moduleId, { initial = owner, refreshed = refreshedOwner, refreshImpl, respond, count = 2 } = {}) {
  let active = initial, refreshes = 0;
  const records = new Map(), requests = [];
  for (let index = 0; index < count; index++) {
    const report = {
      completion_id: `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`,
      owner_user_id: owner.user.id, module_id: moduleId, completed_at: new Date().toISOString(),
      mastery_label: 'Mastered', mastery_score: 80, time_on_skill_seconds: 300,
      item_records: [{ item_id: 'A5A-M01', attempt_count: 1, first_attempt_correct: true, hint_count: 0, first_error_tag: null }]
    };
    records.set(prefix + report.completion_id, JSON.stringify(report));
  }
  const original = [...records];
  const client = { auth: {
    async getSession() { return { data: { session: active }, error: null }; },
    async refreshSession() {
      refreshes++;
      if (refreshImpl) return refreshImpl(api);
      active = refreshed;
      return { data: { session: active }, error: null };
    }
  } };
  const context = vm.createContext({
    AbortController, clearTimeout,
    setTimeout(callback, delay) { return setTimeout(callback, delay === 15000 ? 10 : delay); },
    PENDING_PROGRESS_PREFIX: prefix, supabaseClient: client, console: { warn() {} },
    window: {}, document: { querySelector() { return { textContent: '' }; } },
    migrateLegacyLocalLessonProgress() {},
    localStorage: {
      get length() { return records.size; }, key(i) { return [...records.keys()][i] || null; },
      getItem(k) { return records.get(k) || null; }, removeItem(k) { records.delete(k); }
    },
    async fetch(url, options) {
      requests.push({ url, options });
      return respond ? respond(api, url, options) : response();
    }
  });
  vm.runInContext(source, context);
  const api = {
    requests, records, original, setActive(value) { active = value; }, get refreshes() { return refreshes; },
    replay() { context.dashboardSession = owner; return vm.runInContext('syncPendingLessonProgress(dashboardSession)', context); },
    async refreshDashboard() {
      vm.runInContext('globalThis.progressRefreshSequence = 0; globalThis.LESSON_PROGRESS_PREFIX = "toluxLessonProgress:"; globalThis.rendered = null; console.error = () => {};', context);
      vm.runInContext(localReader + refreshSource, context);
      vm.runInContext('function renderDeviceOnlyTestPrep() {} function renderDashboardProgress(activities, source) { globalThis.rendered = { activities, source }; }', context);
      context.dashboardSession = owner;
      await vm.runInContext('refreshDashboardProgress(dashboardSession)', context);
      return vm.runInContext('globalThis.rendered', context);
    },
    assertUnchanged() { assert.deepEqual([...records], original); }
  };
  return api;
}

async function boundedReplay(f) {
  let timer;
  try {
    return await Promise.race([f.replay(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Dashboard replay remained stalled')), 250);
    })]);
  } finally { clearTimeout(timer); }
}

for (const stage of ['request', 'body']) {
  test(`diagnostic dashboard ${stage} timeout preserves first-attempt evidence and original-owner recovery`, async () => {
    const report = buildDiagnosticProgressReport({
      moduleId: 'alg1-a5a-linear-equations', ownerId: owner.user.id,
      completionId: '123e4567-e89b-42d3-a456-426614174321',
      completedAt: '2026-11-05T12:00:00.000Z', timeOnSkillSeconds: 60,
      items: [{ id: 'A5A-D01' }, { id: 'A5A-D02' }],
      itemRecords: [
        { item_id: 'A5A-D01', attempt_count: 2, first_attempt_correct: false,
          hint_count: 1, first_error_tag: 'distribution' },
        { item_id: 'A5A-D02', attempt_count: 1, first_attempt_correct: true,
          hint_count: 0, first_error_tag: null }
      ]
    });
    let stalled = true, finish;
    const f = fixture(report.module_id, { count: 0, respond(_api, _url, options) {
      if (options.method !== 'POST') return response(200, { activities: [report] });
      if (!stalled) {
        const normalized = normalizeLessonProgressReport(JSON.parse(options.body));
        assert.equal(normalized.mastery_score, 50);
        assert.equal(normalized.client_completion_id, report.completion_id);
        return response(200, { activity: normalized });
      }
      const pending = new Promise(resolve => { finish = resolve; });
      return stage === 'request' ? pending : { ok: true, status: 200, json: () => pending };
    } });
    const entry = [prefix + report.completion_id, JSON.stringify(report)];
    f.records.set(...entry);
    f.original.push(entry);
    await boundedReplay(f);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].options.signal.aborted, true);
    f.assertUnchanged();
    finish(stage === 'request' ? response(200, { activity: report }) : { activity: report });
    await new Promise(resolve => setTimeout(resolve, 0));
    f.assertUnchanged();
    f.setActive(other);
    await boundedReplay(f);
    assert.equal(f.requests.length, 1);
    f.assertUnchanged();
    f.setActive(owner);
    stalled = false;
    const rendered = await f.refreshDashboard();
    assert.equal(f.requests.length, 3);
    assert.equal(f.requests[1].options.body, entry[1]);
    assert.equal(f.requests[0].options.body, f.requests[1].options.body);
    assert.equal(f.records.size, 0);
    assert.equal(rendered.source, 'account');
    assert.equal(rendered.activities[0].module_id, 'diagnostic-alg1-a5a-linear-equations');
    assert.equal(rendered.activities[0].mastery_score, 50);
    assert.deepEqual(rendered.activities[0].item_records, report.item_records);
  });
}

for (const stage of ['request', 'body']) {
  test(`dashboard stalled ${stage} aborts the batch, preserves all reports and permits exact-attempt recovery`, async () => {
    let stalled = true, finish;
    const f = fixture('practice-alg1-a5a-linear-equations', { respond() {
      if (!stalled) return response();
      const pending = new Promise(resolve => { finish = resolve; });
      return stage === 'request' ? pending : { ok: true, status: 200, json: () => pending };
    } });
    await boundedReplay(f);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].options.signal.aborted, true);
    f.assertUnchanged();
    finish(stage === 'request' ? response() : { activity: { mastery_score: 80 } });
    await new Promise(resolve => setTimeout(resolve, 0));
    f.assertUnchanged();
    stalled = false;
    await boundedReplay(f);
    assert.equal(f.requests.length, 3);
    assert.equal(f.requests[0].options.body, f.requests[1].options.body);
    assert.equal(f.requests[1].options.body, f.original[0][1]);
    assert.equal(f.requests[2].options.body, f.original[1][1]);
    assert.equal(f.records.size, 0);
  });
}

test('dashboard continues to account history after a replay timeout without claiming the queue synced', async () => {
  const f = fixture('alg1-a5a-linear-equations', { count: 1, respond(_api, _url, options) {
    if (options.method === 'POST') return new Promise(() => {});
    return response(200, { activities: [] });
  } });
  let timer;
  try {
    const rendered = await Promise.race([f.refreshDashboard(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('History blocked behind replay')), 250);
    })]);
    assert.equal(rendered.source, 'account');
    assert.equal(f.requests.length, 2);
    f.assertUnchanged();
  } finally { clearTimeout(timer); }
});

test('dashboard 401 gets only one bounded same-owner retry before stopping the batch', async () => {
  const f = fixture('alg1-a5a-linear-equations', { respond(api) {
    return api.requests.length === 1 ? response(401, {}) : new Promise(() => {});
  } });
  await boundedReplay(f);
  assert.equal(f.requests.length, 2);
  assert.equal(f.refreshes, 1);
  assert.equal(f.requests[0].options.body, f.requests[1].options.body);
  assert.equal(f.requests[1].options.headers.Authorization, 'Bearer fresh-token');
  assert.equal(f.requests[1].options.signal.aborted, true);
  f.assertUnchanged();
  f.setActive(other);
  await boundedReplay(f);
  assert.equal(f.requests.length, 2);
  f.assertUnchanged();
});

test('successful dashboard replay clears the deadline without a later abort', async () => {
  const f = fixture('alg1-a5a-linear-equations', { count: 1 });
  await boundedReplay(f);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].options.signal.aborted, false);
  assert.equal(f.records.size, 0);
});

test('dashboard history uses the refreshed replay token and renders confirmed account progress', async () => {
  const f = fixture('alg1-a5a-linear-equations', { count: 1, respond(api, url, options) {
    if (options.method === 'POST') return api.requests.length === 1 ? response(401, {}) : response();
    return response(200, { activities: [{ module_id: 'alg1-a5a-linear-equations', mastery_score: 80 }] });
  } });
  const rendered = await f.refreshDashboard();
  assert.equal(f.refreshes, 1);
  assert.equal(f.requests.length, 3);
  assert.equal(f.requests[2].options.headers.Authorization, 'Bearer fresh-token');
  assert.equal(rendered.source, 'account');
  assert.equal(rendered.activities[0].mastery_score, 80);
  assert.equal(f.records.size, 0);
});

test('dashboard refresh into another student cannot load the earlier student\'s history', async () => {
  const f = fixture('practice-alg1-a5a-linear-equations', { refreshed: other, respond: () => response(401, {}) });
  const rendered = await f.refreshDashboard();
  assert.equal(f.refreshes, 1);
  assert.equal(f.requests.length, 1);
  assert.equal(rendered.source, 'local');
  assert.equal(rendered.activities.length, 0);
  f.assertUnchanged();
});

for (const [kind, moduleId] of [['Tutor', 'alg1-a5a-linear-equations'], ['Practice', 'practice-alg1-a5a-linear-equations']]) {
  test(`${kind} dashboard refreshes one 401 and replays the exact report before continuing with the new token`, async () => {
    const f = fixture(moduleId, { respond(api) {
      if (api.requests.length === 1) return response(401, {});
      const report = JSON.parse(api.requests.at(-1).options.body);
      const normalized = normalizeLessonProgressReport(report);
      return response(200, { activity: { ...normalized, user_id: owner.user.id } });
    } });
    await f.replay();
    assert.equal(f.refreshes, 1);
    assert.equal(f.requests.length, 3);
    assert.deepEqual(f.requests.map(r => r.options.headers.Authorization), ['Bearer original-token', 'Bearer fresh-token', 'Bearer fresh-token']);
    assert.equal(f.requests[0].options.body, f.requests[1].options.body);
    assert.equal(f.requests[1].options.body, f.original[0][1]);
    assert.equal(f.requests[2].options.body, f.original[1][1]);
    assert.equal(f.records.size, 0);
  });

  test(`${kind} repeated 401 stops the entire batch without a third request or refresh storm`, async () => {
    const f = fixture(moduleId, { respond: () => response(401, {}) });
    await f.replay();
    assert.equal(f.refreshes, 1); assert.equal(f.requests.length, 2); f.assertUnchanged();
  });

  test(`${kind} signed-out, switched, or tokenless sessions never start replay or refresh`, async () => {
    for (const initial of [null, other, { user: owner.user }]) {
      const f = fixture(moduleId, { initial }); await f.replay();
      assert.equal(f.requests.length, 0); assert.equal(f.refreshes, 0); f.assertUnchanged();
    }
  });

  test(`${kind} account changes after a 401 block refresh and preserve every queued result`, async () => {
    for (const next of [null, other]) {
      const f = fixture(moduleId, { respond(api) { api.setActive(next); return response(401, {}); } });
      await f.replay();
      assert.equal(f.requests.length, 1); assert.equal(f.refreshes, 0); f.assertUnchanged();
    }
  });

  test(`${kind} refresh into another account, no account, or a tokenless account cannot retry`, async () => {
    for (const refreshed of [other, null, { user: owner.user }]) {
      const f = fixture(moduleId, { refreshed, respond: () => response(401, {}) }); await f.replay();
      assert.equal(f.requests.length, 1); assert.equal(f.refreshes, 1); f.assertUnchanged();
    }
  });

  test(`${kind} refresh errors or exceptions stop the batch without clearing recovery`, async () => {
    for (const throws of [false, true]) {
      const f = fixture(moduleId, { respond: () => response(401, {}), refreshImpl() {
        if (throws) throw new Error('Refresh unavailable');
        return { data: { session: refreshedOwner }, error: new Error('Refresh rejected') };
      } });
      await f.replay();
      assert.equal(f.requests.length, 1); assert.equal(f.refreshes, 1); f.assertUnchanged();
    }
  });

  test(`${kind} a refresh response for A cannot override the now-active B account`, async () => {
    const f = fixture(moduleId, { respond: () => response(401, {}), refreshImpl(api) {
      api.setActive(other); return { data: { session: refreshedOwner }, error: null };
    } });
    await f.replay(); assert.equal(f.requests.length, 1); f.assertUnchanged();
  });

  test(`${kind} account changes during the retry cannot clear a result or send the next one`, async () => {
    const f = fixture(moduleId, { respond(api) {
      if (api.requests.length === 1) return response(401, {});
      api.setActive(other); return response();
    } });
    await f.replay(); assert.equal(f.requests.length, 2); f.assertUnchanged();
  });

  test(`${kind} account changes during retry JSON parsing leave recovery intact`, async () => {
    const f = fixture(moduleId, { respond(api) {
      if (api.requests.length === 1) return response(401, {});
      return { status: 200, ok: true, async json() { api.setActive(other); return { activity: {} }; } };
    } });
    await f.replay(); assert.equal(f.requests.length, 2); f.assertUnchanged();
  });

  test(`${kind} malformed retry success or 503 never clears its queued completion`, async () => {
    for (const retry of [response(200, {}), response(503, {})]) {
      const f = fixture(moduleId, { count: 1, respond: api => api.requests.length === 1 ? response(401, {}) : retry });
      await f.replay(); assert.equal(f.requests.length, 2); assert.equal(f.refreshes, 1); f.assertUnchanged();
    }
  });

  test(`${kind} an offline retry keeps the original completion and does not loop`, async () => {
    const f = fixture(moduleId, { count: 1, respond(api) {
      if (api.requests.length === 1) return response(401, {});
      throw new Error('Offline');
    } });
    await f.replay(); assert.equal(f.requests.length, 2); assert.equal(f.refreshes, 1); f.assertUnchanged();
  });

  test(`${kind} successful existing-token replay does not refresh or rewrite reports`, async () => {
    const f = fixture(moduleId); await f.replay();
    assert.equal(f.requests.length, 2); assert.equal(f.refreshes, 0); assert.equal(f.records.size, 0);
    assert.deepEqual(f.requests.map(r => r.options.body), f.original.map(([, report]) => report));
  });
}
