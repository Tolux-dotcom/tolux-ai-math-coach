import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeLessonProgressReport } from '../lesson-progress.mjs';

const source = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const migration = source.slice(source.indexOf('function generateProgressCompletionId('), source.indexOf('function formatCompletionDate('));
const localReader = source.slice(source.indexOf('function readLocalLessonActivities('), source.indexOf('function readLocalTestPrepActivities('));
const replay = source.slice(source.indexOf('function readPendingLessonProgress('), source.indexOf('function renderDashboardProgress('));
const refresh = source.slice(source.indexOf('async function refreshDashboardProgress('), source.indexOf('function updateDashboardActivity('));
const owner = { access_token: 'owner-token', user: { id: 'cefac2b0-5c7c-46ca-bc63-58900aacb001' } };
const otherId = 'cefac2b0-5c7c-46ca-bc63-58900aacb002';
const localPrefix = 'toluxLessonProgress:';
const pendingPrefix = 'toluxPendingLessonProgress:';
const generatedId = '123e4567-e89b-42d3-a456-426614174999';
const damaged = '{"PRIVATE_DAMAGED_PAYLOAD":';

function report(moduleId, index = 1, ownerId = owner.user.id) {
  return {
    completion_id: `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`,
    module_id: moduleId, owner_user_id: ownerId, completed_at: '2026-10-18T12:00:00.000Z',
    mastery_label: 'Mastered', mastery_score: 80, time_on_skill_seconds: 300,
    item_records: [{ item_id: 'A5A-M01', attempt_count: 1, first_attempt_correct: true, hint_count: 0, first_error_tag: null }]
  };
}

function response(status, data) {
  return { status, ok: status >= 200 && status < 300, async json() { return data; } };
}

function fixture({ respond, failedReads = new Set(), beforeWrite } = {}) {
  const data = new Map(), requests = [], logs = [], writes = [];
  let token = owner.access_token, refreshes = 0, generated = 0;
  const context = vm.createContext({
    Date, Uint8Array, LESSON_PROGRESS_PREFIX: localPrefix, PENDING_PROGRESS_PREFIX: pendingPrefix,
    window: { crypto: { randomUUID: () => `123e4567-e89b-42d3-a456-${426614174999 + generated++}` } },
    document: { querySelector() { return { textContent: '' }; } },
    console: { warn(...args) { logs.push(args); }, error(...args) { logs.push(args); } },
    supabaseClient: { auth: {
      async getSession() { return { data: { session: { ...owner, access_token: token } }, error: null }; },
      async refreshSession() { refreshes++; token = 'fresh-owner-token'; return { data: { session: { ...owner, access_token: token } }, error: null }; }
    } },
    localStorage: {
      get length() { return data.size; }, key(i) { return [...data.keys()][i] || null; },
      getItem(k) { if (failedReads.has(k)) throw new Error('Read unavailable'); return data.get(k) || null; },
      setItem(k, v) { writes.push({ key: k, value: String(v) }); beforeWrite?.(k, v, writes.length); data.set(k, String(v)); },
      removeItem(k) { data.delete(k); }
    },
    async fetch(url, options) {
      requests.push({ url, options });
      if (respond) return respond(api, options);
      const normalized = normalizeLessonProgressReport(JSON.parse(options.body));
      return response(200, { activity: { ...normalized, user_id: owner.user.id } });
    }
  });
  vm.runInContext(migration + localReader + replay + refresh, context);
  const run = code => vm.runInContext(code, context);
  const api = {
    data, requests, logs, writes, get refreshes() { return refreshes; },
    migrate: () => run('migrateLegacyLocalLessonProgress()'),
    pending: () => run(`readPendingLessonProgress('${owner.user.id}')`),
    local: () => run(`readLocalLessonActivities('${owner.user.id}')`),
    replay: () => run(`syncPendingLessonProgress(${JSON.stringify(owner)})`),
    async refreshDashboard() {
      run('globalThis.progressRefreshSequence = 0; globalThis.rendered = null; function renderDeviceOnlyTestPrep() {} function renderDashboardProgress(activities, source) { globalThis.rendered = { activities, source }; }');
      await run(`refreshDashboardProgress(${JSON.stringify(owner)})`);
      return run('globalThis.rendered');
    }
  };
  return api;
}

for (const [kind, moduleId] of [['Tutor', 'alg1-a5a-linear-equations'], ['Practice', 'practice-alg1-a5a-linear-equations']]) {
  test(`${kind}: failed migration staging leaves the legacy result byte-for-byte intact and retryable`, () => {
    const legacy = report(moduleId); delete legacy.completion_id;
    const original = JSON.stringify(legacy), key = localPrefix + moduleId;
    const f = fixture({ beforeWrite() { throw new Error('Storage unavailable'); } });
    f.data.set(key, original); f.migrate();
    assert.equal(f.data.get(key), original); assert.equal(f.data.size, 1);
    const reload = fixture(); for (const entry of f.data) reload.data.set(...entry);
    reload.migrate();
    assert.equal(reload.pending().length, 1);
    assert.equal(reload.pending()[0].report.mastery_score, legacy.mastery_score);
  });

  test(`${kind}: failed queue write resumes after reload with the same completion id and original owner`, () => {
    const legacy = report(moduleId); delete legacy.completion_id;
    const key = localPrefix + moduleId;
    const f = fixture({ beforeWrite(k) { if (k.startsWith(pendingPrefix)) throw new Error('Quota exceeded'); } });
    f.data.set(key, JSON.stringify(legacy)); f.migrate();
    const staged = JSON.parse(f.data.get(key));
    assert.equal(staged.completion_id, generatedId);
    assert.equal(staged.local_progress_migration_pending, true);
    assert.equal(f.pending().length, 0);
    const reload = fixture(); for (const entry of f.data) reload.data.set(...entry);
    reload.migrate(); reload.migrate();
    const queued = reload.pending(); assert.equal(queued.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(queued[0].report)), { ...legacy, completion_id: generatedId });
    assert.deepEqual(JSON.parse(reload.data.get(key)), { ...legacy, completion_id: generatedId });
  });

  test(`${kind}: failed migration finalization never creates a second queue id or sends its local marker`, async () => {
    const legacy = report(moduleId); delete legacy.completion_id;
    const key = localPrefix + moduleId;
    const f = fixture({ beforeWrite(k, value) {
      if (k === key && !JSON.parse(value).local_progress_migration_pending) throw new Error('Finalization unavailable');
    } });
    f.data.set(key, JSON.stringify(legacy)); f.migrate(); f.migrate();
    assert.equal(f.pending().length, 1);
    assert.equal(JSON.parse(f.data.get(key)).local_progress_migration_pending, true);
    await f.replay(); assert.equal(f.requests.length, 1);
    assert.deepEqual(JSON.parse(f.requests[0].options.body), { ...legacy, completion_id: generatedId });
    const reload = fixture(); for (const entry of f.data) reload.data.set(...entry);
    reload.migrate();
    assert.equal(reload.pending().length, 1);
    assert.equal(reload.pending()[0].report.completion_id, generatedId);
    assert.equal(normalizeLessonProgressReport(reload.pending()[0].report).client_completion_id, generatedId);
    assert.equal(JSON.parse(reload.data.get(key)).local_progress_migration_pending, undefined);
  });

  test(`${kind}: a migration write failure cannot strand later owned legacy results`, () => {
    const first = report(moduleId), second = report(moduleId + '-second', 2);
    delete first.completion_id; delete second.completion_id;
    const firstKey = localPrefix + first.module_id;
    const f = fixture({ beforeWrite(k) { if (k === firstKey) throw new Error('One key unavailable'); } });
    const original = JSON.stringify(first); f.data.set(firstKey, original);
    f.data.set(localPrefix + second.module_id, JSON.stringify(second)); f.migrate();
    assert.equal(f.data.get(firstKey), original);
    assert.equal(f.pending().length, 1); assert.equal(f.pending()[0].report.module_id, second.module_id);
    assert.equal(f.pending()[0].report.mastery_score, second.mastery_score);
  });

  test(`${kind}: successful migration stops writing once queued and does not revive completed ordinary history`, () => {
    const legacy = report(moduleId); delete legacy.completion_id;
    const f = fixture(); f.data.set(localPrefix + moduleId, JSON.stringify(legacy)); f.migrate();
    const writeCount = f.writes.length; f.migrate(); assert.equal(f.writes.length, writeCount);
    f.data.delete(pendingPrefix + generatedId); f.migrate();
    assert.equal(f.pending().length, 0); assert.equal(f.writes.length, writeCount);
  });

  test(`${kind}: recovery markers never override confirmed history or missing original ownership`, () => {
    const marked = { ...report(moduleId), local_progress_migration_pending: true };
    const unowned = { ...marked, owner_user_id: null };
    const confirmed = { ...marked, client_completion_id: marked.completion_id };
    const f = fixture();
    f.data.set(localPrefix + 'unowned', JSON.stringify(unowned));
    f.data.set(localPrefix + 'confirmed', JSON.stringify(confirmed));
    const original = [...f.data]; f.migrate();
    assert.deepEqual([...f.data], original); assert.equal(f.writes.length, 0);
  });

  test(`${kind}: malformed pending values cannot hide valid owned completions before or after them`, () => {
    const f = fixture();
    for (const [index, value] of [damaged, 'null', '[]', '7', 'true', '"text"'].entries()) f.data.set(`${pendingPrefix}bad-${index}`, value);
    const first = report(moduleId), second = report(moduleId, 2);
    f.data.set(pendingPrefix + first.completion_id, JSON.stringify(first));
    f.data.set(`${pendingPrefix}bad-middle`, '{');
    f.data.set(pendingPrefix + second.completion_id, JSON.stringify(second));
    f.data.set(`${pendingPrefix}bad-last`, 'undefined');
    const original = [...f.data];
    assert.deepEqual(Array.from(f.pending(), entry => entry.report.completion_id), [first.completion_id, second.completion_id]);
    assert.deepEqual([...f.data], original);
    assert.doesNotMatch(String(f.logs), /PRIVATE_DAMAGED_PAYLOAD/);
  });

  test(`${kind}: valid replay behind damaged data keeps its score and id through a 401 retry`, async () => {
    const f = fixture({ respond(api, options) {
      if (api.requests.length === 1) return response(401, {});
      const normalized = normalizeLessonProgressReport(JSON.parse(options.body));
      return response(200, { activity: normalized });
    } });
    const expected = JSON.stringify(report(moduleId));
    f.data.set(`${pendingPrefix}bad`, damaged);
    f.data.set(pendingPrefix + report(moduleId).completion_id, expected);
    await f.replay();
    assert.equal(f.requests.length, 2); assert.equal(f.refreshes, 1);
    assert.deepEqual(f.requests.map(r => r.options.body), [expected, expected]);
    assert.equal(f.data.size, 1); assert.equal(f.data.get(`${pendingPrefix}bad`), damaged);
  });

  test(`${kind}: legacy migration skips damaged data without changing unowned or confirmed history`, () => {
    const f = fixture();
    const legacy = report(moduleId); delete legacy.completion_id;
    const unowned = { ...legacy }; delete unowned.owner_user_id;
    const confirmed = { ...legacy, client_completion_id: report(moduleId, 3).completion_id };
    f.data.set(`${localPrefix}bad`, damaged);
    f.data.set(`${localPrefix}unowned`, JSON.stringify(unowned));
    f.data.set(`${localPrefix}confirmed`, JSON.stringify(confirmed));
    f.data.set(`${localPrefix}valid`, JSON.stringify(legacy));
    f.migrate();
    assert.equal(f.data.get(`${localPrefix}bad`), damaged);
    assert.equal(f.data.get(`${localPrefix}unowned`), JSON.stringify(unowned));
    assert.equal(f.data.get(`${localPrefix}confirmed`), JSON.stringify(confirmed));
    const queued = JSON.parse(f.data.get(pendingPrefix + generatedId));
    assert.equal(queued.owner_user_id, owner.user.id); assert.equal(queued.mastery_score, 80);
    assert.equal(normalizeLessonProgressReport(queued).client_completion_id, generatedId);
  });

  test(`${kind}: local fallback skips malformed values but still excludes other accounts and unowned work`, () => {
    const f = fixture();
    f.data.set(`${localPrefix}bad`, damaged);
    for (const [index, value] of ['null', '[]', 'false', '"text"'].entries()) f.data.set(`${localPrefix}bad-${index}`, value);
    f.data.set(`${localPrefix}other`, JSON.stringify(report(moduleId, 3, otherId)));
    f.data.set(`${localPrefix}unowned`, JSON.stringify(report(moduleId, 4, null)));
    f.data.set(`${localPrefix}own`, JSON.stringify(report(moduleId)));
    const original = [...f.data];
    const local = f.local(); assert.equal(local.length, 1); assert.equal(local[0].owner_user_id, owner.user.id);
    assert.deepEqual([...f.data], original);
  });

  test(`${kind}: one unreadable storage key cannot abort migration, local history, or pending recovery`, () => {
    const blockedLocal = `${localPrefix}blocked`, blockedPending = `${pendingPrefix}blocked`;
    const f = fixture({ failedReads: new Set([blockedLocal, blockedPending]) });
    const blocked = JSON.stringify(report(moduleId, 9));
    f.data.set(blockedLocal, blocked); f.data.set(blockedPending, blocked);
    const legacy = report(moduleId); delete legacy.completion_id;
    f.data.set(`${localPrefix}valid`, JSON.stringify(legacy));
    f.data.set(pendingPrefix + report(moduleId, 2).completion_id, JSON.stringify(report(moduleId, 2)));
    f.migrate(); assert.equal(f.local().length, 1); assert.equal(f.pending().length, 2);
    assert.equal(f.data.get(blockedLocal), blocked); assert.equal(f.data.get(blockedPending), blocked);
  });

  test(`${kind}: damaged and other-account data do not consume the 25-owned-record replay limit`, async () => {
    const f = fixture();
    for (let i = 0; i < 30; i++) {
      f.data.set(`${pendingPrefix}bad-${i}`, damaged);
      f.data.set(`${pendingPrefix}other-${i}`, JSON.stringify(report(moduleId, i + 100, otherId)));
    }
    const protectedRecords = [...f.data];
    for (let i = 1; i <= 26; i++) f.data.set(pendingPrefix + report(moduleId, i).completion_id, JSON.stringify(report(moduleId, i)));
    assert.equal(f.pending().length, 25);
    await f.replay(); assert.equal(f.requests.length, 25); assert.equal(f.data.size, 61);
    for (const [key, value] of protectedRecords) assert.equal(f.data.get(key), value);
    assert.ok(f.data.has(pendingPrefix + report(moduleId, 26).completion_id));
  });

  test(`${kind}: failed recovery retains both the damaged record and the valid original report`, async () => {
    const f = fixture({ respond() { throw new Error('Offline'); } });
    f.data.set(`${pendingPrefix}bad`, damaged);
    f.data.set(pendingPrefix + report(moduleId).completion_id, JSON.stringify(report(moduleId)));
    const original = [...f.data];
    await f.replay(); assert.equal(f.requests.length, 1); assert.deepEqual([...f.data], original);
  });
}

test('dashboard history failure still shows owned local progress behind damaged entries after valid replay', async () => {
  const moduleId = 'alg1-a5a-linear-equations';
  const f = fixture({ respond(api, options) {
    return options.method === 'POST' ? response(200, { activity: {} }) : response(503, {});
  } });
  f.data.set(`${localPrefix}bad`, damaged); f.data.set(`${pendingPrefix}bad`, damaged);
  f.data.set(`${localPrefix}valid`, JSON.stringify(report(moduleId)));
  f.data.set(pendingPrefix + report(moduleId).completion_id, JSON.stringify(report(moduleId)));
  const displayed = await f.refreshDashboard();
  assert.equal(displayed.source, 'local'); assert.equal(displayed.activities.length, 1);
  assert.equal(displayed.activities[0].mastery_score, 80);
  assert.equal(f.requests.length, 2);
  assert.equal(f.data.get(`${localPrefix}bad`), damaged); assert.equal(f.data.get(`${pendingPrefix}bad`), damaged);
});
