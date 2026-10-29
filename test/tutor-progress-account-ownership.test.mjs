import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as lessonCore from '../public/lesson-core.mjs';
import * as courseCore from '../public/course-core.mjs';
import { persistPracticeCompletion } from '../public/practice-progress.mjs';
import { normalizeLessonProgressReport } from '../lesson-progress.mjs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('public/lesson.js')
  .replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '')
  .replace(/loadLesson\(\);\s*$/, '');
const app = read('public/app.js');
const migration = app.slice(app.indexOf('function generateProgressCompletionId('), app.indexOf('function formatCompletionDate('));
const replay = app.slice(app.indexOf('function readPendingLessonProgress('), app.indexOf('function renderDashboardProgress('));
const localReader = app.slice(app.indexOf('function readLocalLessonActivities('), app.indexOf('function readLocalTestPrepActivities('));
const dashboardRefresh = app.slice(app.indexOf('async function refreshDashboardProgress('), app.indexOf('function updateDashboardActivity('));
const module = JSON.parse(read('public/a5a-linear-equations.json'));
const owner = { access_token: 'student-a-token', user: { id: 'cefac2b0-5c7c-46ca-bc63-58900aacb001' } };
const other = { access_token: 'student-b-token', user: { id: 'cefac2b0-5c7c-46ca-bc63-58900aacb002' } };
const id = '123e4567-e89b-42d3-a456-426614174000';
const pendingKey = `toluxPendingLessonProgress:${id}`;
const localKey = `toluxLessonProgress:${module.module_id}`;

function response(status = 200, data = { activity: { mastery_score: 100 } }) {
  return { status, ok: status >= 200 && status < 300, async json() { return data; } };
}

function fixture({ initial = owner, refreshed = { ...owner, access_token: 'refreshed-a' }, respond, storageFails = false } = {}) {
  let active = initial, refreshes = 0;
  const data = new Map(), requests = [], elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      style: {}, value: '', textContent: '', innerHTML: '', disabled: false, hidden: false, handlers: {},
      addEventListener(event, handler) { this.handlers[event] = handler; }, setAttribute() {}, focus() {}
    });
    return elements.get(selector);
  };
  const storage = {
    get length() { return data.size; }, key(i) { return [...data.keys()][i] || null; },
    getItem(k) { return data.get(k) || null; },
    setItem(k, v) { if (storageFails) throw new Error('Quota exceeded'); data.set(k, String(v)); },
    removeItem(k) { data.delete(k); }
  };
  const client = { auth: {
    async getSession() { return { data: { session: active }, error: null }; },
    async refreshSession() { refreshes++; active = refreshed; return { data: { session: active }, error: null }; }
  } };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return respond ? respond(url, options, api) : url === '/api/lesson-progress'
      ? response() : response(200, { allowed: true, isSubscriber: false });
  };
  const context = vm.createContext({
    ...lessonCore, ...courseCore, URLSearchParams, Date, Uint8Array, Map, Set,
    document: { querySelector: element, visibilityState: 'visible' },
    window: { TOLUX_PUBLIC_CONFIG: {}, supabase: { createClient() { return client; } }, crypto: { randomUUID: () => id } },
    localStorage: storage, fetch: fetchImpl, console: { warn() {}, error() {} },
    persistPracticeCompletion: options => persistPracticeCompletion({ ...options, storage, fetchImpl })
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run(`lessonModule = ${JSON.stringify(module)}; masterySummary = { label: 'Mastered', scorePercent: 100, correctCount: 5, total: 5 };`);
  const api = {
    run, requests, data, element, setActive(s) { active = s; }, get refreshes() { return refreshes; },
    bind: () => run('getLessonSession()'), save: () => run('saveLessonCompletion()'),
    access: () => run("ensureLessonAccess({ id: 'A5A-M01' })"),
    cachedAccess: () => run("countedLessonInteractions.add('A5A-M01'); ensureLessonAccess({ id: 'A5A-M01' })"),
    report: () => JSON.parse(data.get(pendingKey)),
    status: () => element('#completionSaveStatus').textContent,
    async render() { run('renderCompletion()'); await run('completionSavePromise'); },
    retry: () => element('#retryLessonSaveBtn').handlers.click(),
    local(ownerId) {
      run('globalThis.LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";');
      run(localReader);
      context.localOwnerId = ownerId;
      return run('readLocalLessonActivities(localOwnerId)');
    },
    async refreshDashboard() {
      run('globalThis.progressRefreshSequence = 0; globalThis.LESSON_PROGRESS_PREFIX = "toluxLessonProgress:"; globalThis.rendered = null;');
      run(localReader + dashboardRefresh);
      run('async function syncPendingLessonProgress() {} function renderDeviceOnlyTestPrep() {} function renderDashboardProgress(activities) { globalThis.rendered = activities; }');
      await run(`refreshDashboardProgress(${JSON.stringify(owner)})`);
      return run('globalThis.rendered');
    },
    async completeMastery() {
      run("currentStageType = 'mastery_check'; stageItems = selectStageItems(lessonModule, 'mastery_check'); currentItemIndex = 0;");
      for (let i = 0; i < 5; i++) {
        run("lessonAnswer.value = getCurrentItem().answer_key; document.querySelector('#lessonExplanation').value = 'Both sides are equal, so all real x values work.';");
        await run('checkCurrentAnswer()'); run('advanceQuestion()');
      }
      await run('completionSavePromise');
    },
    dashboard() {
      run('globalThis.LESSON_PROGRESS_PREFIX = "toluxLessonProgress:"; globalThis.PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";');
      vm.runInContext(migration + replay, context);
      context.dashboardSession = active;
      return run('syncPendingLessonProgress(dashboardSession)');
    }
  };
  return api;
}

test('Tutor grades five real mastery items and sends a server-valid owned 100% report', async () => {
  const f = fixture();
  await f.completeMastery();
  assert.match(f.status(), /Progress saved/);
  const report = JSON.parse(f.requests.find(r => r.url === '/api/lesson-progress').options.body);
  assert.equal(report.owner_user_id, owner.user.id);
  assert.equal(report.mastery_score, 100);
  assert.equal(report.item_records.length, 5);
  assert.equal(normalizeLessonProgressReport(report).client_completion_id, id);
  assert.equal(f.data.has(pendingKey), false);
  assert.equal(JSON.parse(f.data.get(localKey)).owner_user_id, owner.user.id);
});

test('Tutor queues before transmission and reuses the same completion for offline retry', async () => {
  let offline = true;
  const f = fixture({ respond() {
    assert.equal(f.report().owner_user_id, owner.user.id);
    if (offline) throw new Error('Offline');
    return response();
  } });
  await f.bind();
  assert.equal((await f.save()).synced, false);
  const report = f.data.get(pendingKey);
  offline = false;
  assert.equal((await f.save()).synced, true);
  assert.deepEqual(f.requests.map(r => r.options.body), [report, report]);
});

for (const [label, next] of [['account switch', other], ['sign-out', null]]) {
  test(`Tutor ${label} blocks counted interaction and result reassignment`, async () => {
    const f = fixture(); await f.bind(); f.setActive(next);
    assert.equal(await f.cachedAccess(), false);
    assert.equal((await f.save()).synced, false);
    assert.equal(f.requests.length, 0);
    assert.equal(f.report().owner_user_id, owner.user.id);
  });
}

test('Tutor refreshes a stale token once only for the original student', async () => {
  for (const repeated of [false, true]) {
    let calls = 0;
    const f = fixture({ respond() { return ++calls === 1 || repeated ? response(401, {}) : response(); } });
    await f.bind();
    assert.equal((await f.save()).synced, !repeated);
    assert.equal(f.refreshes, 1);
    assert.deepEqual(f.requests.map(r => r.options.headers.Authorization), ['Bearer student-a-token', 'Bearer refreshed-a']);
    assert.equal(f.data.has(pendingKey), repeated);
  }
});

test('Tutor refresh into another account cannot submit the original report', async () => {
  const f = fixture({ refreshed: other, respond: () => response(401, {}) });
  await f.bind(); assert.equal((await f.save()).synced, false);
  assert.equal(f.requests.length, 1);
  assert.equal(f.report().owner_user_id, owner.user.id);
});

test('Tutor account changes during requests or JSON parsing retain recovery records', async () => {
  for (const parsing of [false, true]) {
    const f = fixture({ respond() {
      if (!parsing) f.setActive(other);
      return { status: 200, ok: true, async json() { f.setActive(other); return { activity: {} }; } };
    } });
    await f.bind(); assert.equal((await f.save()).synced, false);
    assert.equal(f.report().owner_user_id, owner.user.id);
  }
});

test('Tutor access cannot count work after an account change during 401 or parsing', async () => {
  for (const parsing of [false, true]) {
    const f = fixture({ respond() {
      if (!parsing) { f.setActive(other); return response(401, {}); }
      return { status: 200, ok: true, async json() { f.setActive(other); return { allowed: true }; } };
    } });
    assert.equal(await f.access(), false);
    assert.equal(f.refreshes, 0);
    assert.equal(f.run('countedLessonInteractions.size'), 0);
  }
});

test('Tutor usage 401 retries once for the same account and denies a different refreshed account', async () => {
  for (const sameOwner of [true, false]) {
    let calls = 0;
    const f = fixture({ refreshed: sameOwner ? { ...owner, access_token: 'fresh' } : other,
      respond() { return ++calls === 1 ? response(401, {}) : response(200, { allowed: true }); } });
    assert.equal(await f.access(), sameOwner);
    assert.equal(f.refreshes, 1);
    assert.equal(f.requests.length, sameOwner ? 2 : 1);
  }
});

test('Tutor completion displays queue status and its retry button saves the same attempt', async () => {
  let offline = true;
  const f = fixture({ respond: () => offline ? response(503, {}) : response() });
  await f.bind(); await f.render();
  assert.match(f.status(), /Saved on this device for the account/);
  assert.equal(f.element('#retryLessonSaveBtn').hidden, false);
  offline = false; await f.retry();
  assert.match(f.status(), /Progress saved/);
  assert.equal(f.element('#retryLessonSaveBtn').hidden, true);
  assert.equal(f.element('#returnDashboardBtn').disabled, false);
  assert.deepEqual(f.requests.map(r => JSON.parse(r.options.body).completion_id), [id, id]);
});

test('Tutor never claims a device save when both storage and network fail', async () => {
  const f = fixture({ storageFails: true, respond: () => response(503, {}) });
  await f.bind(); await f.render();
  assert.match(f.status(), /could not be saved to your account or this device/);
  assert.doesNotMatch(f.status(), /Saved on this device/);
  assert.equal(f.element('#retryLessonSaveBtn').hidden, false);
});

test('Tutor completion without an identified owner is preserved but never uploaded', async () => {
  const f = fixture({ initial: null }); await f.render();
  assert.equal(f.requests.length, 0);
  assert.equal(f.report().owner_user_id, null);
  assert.match(f.status(), /Saved on this device/);
  f.setActive(owner); assert.equal((await f.save()).synced, false);
  assert.equal(f.requests.length, 0);
});

test('signed-out or bridged readiness still reaches only the two server-approved free diagnostic items', async () => {
  for (const session of [null, { access_token: 'tolux-free-diagnostic', user: null }]) {
    const f = fixture({ initial: session, respond: () => response(200, { allowed: true, isFreeDiagnostic: true }) });
    f.run("currentStageType = 'diagnostic'");
    for (const itemId of ['A5A-D01', 'A5A-D02']) {
      assert.equal(await f.run(`ensureLessonAccess({ id: '${itemId}' })`), true);
    }
    assert.equal(await f.run("ensureLessonAccess({ id: 'A5A-G01' })"), false);
    assert.equal(f.run('lessonOwnerId'), null);
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[0].options.headers.Authorization, undefined);
  }
});

test('free diagnostic requires explicit server confirmation and never bypasses a bound lesson owner', async () => {
  for (const result of [response(200, { allowed: true }), response(403, { allowed: true, isFreeDiagnostic: true })]) {
    const f = fixture({ initial: null, respond: () => result });
    f.run("currentStageType = 'diagnostic'");
    assert.equal(await f.run("ensureLessonAccess({ id: 'A5A-D01' })"), false);
  }
  const f = fixture(); await f.bind(); f.setActive(other); f.run("currentStageType = 'diagnostic'");
  assert.equal(await f.run("ensureLessonAccess({ id: 'A5A-D01' })"), false);
  assert.equal(f.requests.length, 0);
});

test('dashboard leaves unowned legacy Tutor data byte-for-byte intact, with or without completion ids', async () => {
  const f = fixture();
  const legacy = JSON.stringify({ module_id: module.module_id, mastery_score: 80 });
  const pending = JSON.stringify({ module_id: module.module_id, completion_id: id, mastery_score: 80 });
  f.data.set(localKey, legacy); f.data.set(pendingKey, pending);
  await f.dashboard();
  assert.equal(f.requests.length, 0);
  assert.equal(f.data.get(localKey), legacy);
  assert.equal(f.data.get(pendingKey), pending);
});

test('offline Tutor result replays only after the original account returns', async () => {
  let offline = true;
  const f = fixture({ respond: () => { if (offline) throw new Error('Offline'); return response(); } });
  await f.bind(); await f.save();
  const pending = f.data.get(pendingKey);
  f.setActive(other); offline = false; await f.dashboard();
  assert.equal(f.requests.length, 1);
  assert.equal(f.data.get(pendingKey), pending);
  f.setActive(owner); await f.dashboard();
  assert.equal(f.requests.length, 2);
  assert.equal(f.data.has(pendingKey), false);
});

test('already-confirmed server-shaped Tutor history is not migrated into another completion', async () => {
  const f = fixture({ respond: () => response(200, { activity: {
    module_id: module.module_id, client_completion_id: id, mastery_score: 100
  } }) });
  await f.bind(); await f.save();
  const confirmed = f.data.get(localKey);
  await f.dashboard();
  assert.equal(f.requests.length, 1);
  assert.equal(f.data.get(localKey), confirmed);
  assert.equal(f.data.has(pendingKey), false);
});

test('other students cannot consume the 25-record Tutor replay limit', async () => {
  const f = fixture();
  for (let i = 0; i < 26; i++) f.data.set(`toluxPendingLessonProgress:other-${i}`, JSON.stringify({
    completion_id: `other-${i}`, module_id: module.module_id, owner_user_id: other.user.id
  }));
  f.data.set(pendingKey, JSON.stringify({ completion_id: id, module_id: module.module_id, owner_user_id: owner.user.id }));
  await f.dashboard(); assert.equal(f.requests.length, 1); assert.equal(f.data.size, 26);
});

test('dashboard uses the current same-owner token rather than its stale argument', async () => {
  const f = fixture();
  f.data.set(pendingKey, JSON.stringify({ completion_id: id, module_id: module.module_id, owner_user_id: owner.user.id }));
  // Resolve the dashboard session argument, then replace the active token before replay reads auth.
  f.run('globalThis.LESSON_PROGRESS_PREFIX = "toluxLessonProgress:"; globalThis.PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";');
  f.run(migration + replay);
  f.setActive({ ...owner, access_token: 'current-token' });
  await f.run(`syncPendingLessonProgress(${JSON.stringify(owner)})`);
  assert.equal(f.requests[0].options.headers.Authorization, 'Bearer current-token');
});

test('dashboard keeps Tutor pending after malformed success, 401, failure, or parsing error', async () => {
  for (const result of [response(200, {}), response(401, {}), response(503, {}),
    { status: 200, ok: true, async json() { throw new Error('Invalid JSON'); } }]) {
    const f = fixture({ respond: () => result });
    f.data.set(pendingKey, JSON.stringify({ completion_id: id, module_id: module.module_id, owner_user_id: owner.user.id }));
    await f.dashboard(); assert.equal(f.data.has(pendingKey), true);
  }
});

test('dashboard account changes during Tutor replay or JSON parsing cannot clear recovery or send the next record', async () => {
  for (const parsing of [false, true]) {
    const f = fixture({ respond() {
      if (!parsing) f.setActive(other);
      return { status: 200, ok: true, async json() { f.setActive(other); return { activity: {} }; } };
    } });
    for (const completion of [id, 'second']) f.data.set(`toluxPendingLessonProgress:${completion}`, JSON.stringify({
      completion_id: completion, module_id: module.module_id, owner_user_id: owner.user.id
    }));
    await f.dashboard();
    assert.equal(f.requests.length, 1);
    assert.equal(f.data.size, 2);
  }
});

test('local Tutor and Practice fallback history requires its confirmed owner, without deleting unowned data', () => {
  const f = fixture();
  const completed_at = new Date().toISOString();
  for (const [key, moduleId, ownerId] of [
    ['a', module.module_id, owner.user.id], ['b', 'practice-alg1-a5b', other.user.id],
    ['c', 'alg1-legacy', undefined], ['d', 'practice-legacy', undefined]
  ]) f.data.set(`toluxLessonProgress:${key}`, JSON.stringify({ module_id: moduleId, owner_user_id: ownerId, completed_at }));
  const original = [...f.data];
  assert.equal(f.local(owner.user.id).length, 1);
  assert.equal(f.local(other.user.id).length, 1);
  assert.equal(f.local(null).length, 0);
  assert.deepEqual([...f.data], original);
});

test('device-only readiness result never appears under a later account', () => {
  const f = fixture();
  const completed_at = new Date().toISOString();
  const diagnosticModule = `diagnostic-${module.module_id}`;
  for (const [key, ownerId] of [
    ['device', null],
    ['student-a', owner.user.id],
    ['student-b', other.user.id]
  ]) f.data.set(`toluxLessonProgress:diagnostic-${key}`, JSON.stringify({
    module_id: diagnosticModule,
    owner_user_id: ownerId,
    completed_at,
    mastery_score: 50
  }));

  assert.deepEqual(
    Array.from(f.local(null), activity => activity.owner_user_id),
    [null]
  );
  assert.deepEqual(
    Array.from(f.local(owner.user.id), activity => activity.owner_user_id),
    [owner.user.id]
  );
  assert.deepEqual(
    Array.from(f.local(other.user.id), activity => activity.owner_user_id),
    [other.user.id]
  );
});

test('failed account-history loading shows only the same signed-in owner\'s Tutor fallback', async () => {
  const f = fixture({ respond: () => response(503, {}) });
  for (const student of [owner, other]) f.data.set(`toluxLessonProgress:${student.user.id}`, JSON.stringify({
    module_id: module.module_id, completed_at: new Date().toISOString(), owner_user_id: student.user.id
  }));
  const displayed = await f.refreshDashboard();
  assert.equal(displayed.length, 1);
  assert.equal(displayed[0].owner_user_id, owner.user.id);
});

test('account switches or sign-out during history loading cannot expose the earlier owner\'s Tutor fallback', async () => {
  for (const next of [other, null]) {
    const f = fixture({ respond() { f.setActive(next); return response(503, {}); } });
    f.data.set(localKey, JSON.stringify({ module_id: module.module_id, completed_at: new Date().toISOString(), owner_user_id: owner.user.id }));
    assert.equal((await f.refreshDashboard()).length, 0);
    assert.equal(f.data.has(localKey), true);
  }
});
