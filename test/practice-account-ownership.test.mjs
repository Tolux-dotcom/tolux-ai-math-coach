import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const practiceSource = fs.readFileSync(new URL('../public/practice.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '')
  .replace(/startPractice\(\);\s*$/, '');
const appSource = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const dashboardSource = appSource.slice(
  appSource.indexOf('function readPendingLessonProgress('),
  appSource.indexOf('function renderDashboardProgress(')
);
const owner = { access_token: 'original-token', user: { id: 'original-owner' } };
const other = { access_token: 'other-token', user: { id: 'other-owner' } };
const completionId = '123e4567-e89b-42d3-a456-426614174000';
const pendingKey = `toluxPendingLessonProgress:${completionId}`;
const summary = { label: 'Mastered', scorePercent: 80 };

function fixture({ initial = owner, refreshed = { ...owner, access_token: 'fresh-token' }, responses = [], storageFailure = false } = {}) {
  let active = initial;
  let refreshes = 0;
  const storageData = new Map();
  const requests = [];
  const storage = {
    get length() { return storageData.size; },
    key(i) { return [...storageData.keys()][i] || null; },
    getItem(k) { return storageData.get(k) || null; },
    setItem(k, v) { if (storageFailure) throw new Error('Storage unavailable'); storageData.set(k, String(v)); },
    removeItem(k) { storageData.delete(k); }
  };
  const client = { auth: {
    async getSession() { return { data: { session: active }, error: null }; },
    async refreshSession() { refreshes += 1; active = refreshed; return { data: { session: active }, error: null }; }
  } };
  const context = vm.createContext({
    URLSearchParams, Date, Uint8Array, localStorage: storage,
    console: { warn() {}, error() {} },
    window: {
      TOLUX_PUBLIC_CONFIG: {},
      supabase: { createClient() { return client; } },
      crypto: { randomUUID() { return completionId; } }
    },
    document: { querySelector() { return { addEventListener() {}, style: {}, setAttribute() {} }; } },
    async fetch(url, options) {
      const index = requests.length;
      requests.push({ url, options });
      return responses[index] ? await responses[index]() : response();
    }
  });
  vm.runInContext(practiceSource, context);
  vm.runInContext(`session = { module_id: 'alg1-a5a-linear-equations' };`, context);
  return {
    bind: () => vm.runInContext('getPracticeSession()', context),
    save: () => vm.runInContext(`savePracticeCompletion(${JSON.stringify(summary)})`, context),
    cachedAccess: () => vm.runInContext(`countedInteractions.add('q1'); ensurePracticeAccess({ id: 'q1' })`, context),
    setSession(value) { active = value; },
    get refreshes() { return refreshes; },
    requests, storageData, storage,
    dashboard() {
      // Execute the dashboard's real reader and replay functions, with the same auth/storage.
      vm.runInContext('function migrateLegacyLocalLessonProgress() {}', context);
      vm.runInContext(dashboardSource, context);
      return vm.runInContext(`syncPendingLessonProgress(${JSON.stringify(active)})`, context);
    }
  };
}
function response(status = 200, json) {
  return { status, ok: status >= 200 && status < 300, async json() {
    return json ? await json() : { activity: { mastery_score: 80 } };
  } };
}
function pending(f) { return JSON.parse(f.storageData.get(pendingKey)); }

test('Practice queues its original owner before the request and clears only confirmed saves', async () => {
  const f = fixture({ responses: [() => {
    assert.equal(pending(f).owner_user_id, owner.user.id);
    return response();
  }] });
  await f.bind();
  await f.save();
  assert.equal(f.requests.length, 1);
  assert.equal(JSON.parse(f.requests[0].options.body).owner_user_id, owner.user.id);
  assert.equal(f.storageData.has(pendingKey), false);
  const local = JSON.parse(f.storageData.get('toluxLessonProgress:practice-alg1-a5a-linear-equations'));
  assert.equal(local.owner_user_id, owner.user.id);
});

test('generic Practice reports that an offline result was not saved when device storage is unavailable', async () => {
  const f = fixture({ storageFailure: true, responses: [() => { throw new Error('Offline'); }] });
  await f.bind();
  await assert.rejects(f.save(), error => error.pendingSaved === false);
  assert.equal(f.storageData.size, 0);
  assert.match(practiceSource, /Progress could not be saved to your account or this device/);
});

test('Practice retries a 401 once with a refreshed token for the same student', async () => {
  const f = fixture({ responses: [() => response(401)] });
  await f.bind();
  await f.save();
  assert.equal(f.refreshes, 1);
  assert.deepEqual(f.requests.map(r => r.options.headers.Authorization), ['Bearer original-token', 'Bearer fresh-token']);
  assert.equal(f.storageData.has(pendingKey), false);
});

test('a repeated 401 retains the original result without a third request', async () => {
  const f = fixture({ responses: [() => response(401), () => response(401)] });
  await f.bind();
  await assert.rejects(f.save());
  assert.equal(f.requests.length, 2);
  assert.equal(pending(f).mastery_score, 80);
});

for (const [label, next] of [['account switch', other], ['sign-out', null]]) {
  test(`${label} before saving cannot attribute Practice to a new account`, async () => {
    const f = fixture();
    await f.bind();
    f.setSession(next);
    await assert.rejects(f.save());
    assert.equal(f.requests.length, 0);
    assert.equal(pending(f).owner_user_id, owner.user.id);
  });
  test(`${label} after a request keeps the pending Practice result intact`, async () => {
    const f = fixture({ responses: [() => { f.setSession(next); return response(); }] });
    await f.bind();
    await assert.rejects(f.save());
    assert.equal(pending(f).owner_user_id, owner.user.id);
  });
}

test('switching accounts before a 401 blocks refresh and retry', async () => {
  const f = fixture({ responses: [() => { f.setSession(other); return response(401); }] });
  await f.bind();
  await assert.rejects(f.save());
  assert.equal(f.refreshes, 0);
  assert.equal(f.requests.length, 1);
});

test('refresh to a different account cannot save another student’s Practice result', async () => {
  const f = fixture({ refreshed: other, responses: [() => response(401)] });
  await f.bind();
  await assert.rejects(f.save());
  assert.equal(f.requests.length, 1);
  assert.equal(pending(f).owner_user_id, owner.user.id);
});

test('account changes during response parsing cannot erase the recovery record', async () => {
  const f = fixture({ responses: [() => response(200, () => {
    f.setSession(other); return { activity: { mastery_score: 80 } };
  })] });
  await f.bind();
  await assert.rejects(f.save());
  assert.equal(pending(f).mastery_score, 80);
});

test('already-counted interactions still check the original student session', async () => {
  const f = fixture();
  await f.bind();
  f.setSession(other);
  assert.equal(await f.cachedAccess(), false);
  assert.equal(f.requests.length, 0);
});

test('offline Practice remains queued and dashboard replay is restricted to its owner', async () => {
  const f = fixture({ responses: [() => { throw new Error('Offline'); }] });
  await f.bind();
  await assert.rejects(f.save());
  const original = f.storageData.get(pendingKey);
  f.setSession(other);
  await f.dashboard();
  assert.equal(f.requests.length, 1);
  assert.equal(f.storageData.get(pendingKey), original);
  f.setSession(owner);
  // Reader/replay bindings already loaded.
  const g = fixture();
  g.storageData.set(pendingKey, original);
  await g.dashboard();
  assert.equal(g.requests.length, 1);
  assert.equal(g.requests[0].options.headers.Authorization, 'Bearer original-token');
  assert.equal(g.storageData.has(pendingKey), false);
});

test('dashboard preserves unowned legacy Practice without guessing who completed it', async () => {
  const f = fixture();
  const legacy = JSON.stringify({ completion_id: completionId, module_id: 'practice-legacy', mastery_score: 60 });
  f.storageData.set(pendingKey, legacy);
  await f.dashboard();
  assert.equal(f.requests.length, 0);
  assert.equal(f.storageData.get(pendingKey), legacy);
});

test('another student’s pending records cannot starve the owner’s replay limit', async () => {
  const f = fixture();
  for (let i = 0; i < 26; i += 1) {
    f.storageData.set(`toluxPendingLessonProgress:other-${i}`, JSON.stringify({
      completion_id: `other-${i}`, module_id: 'practice-a5a', owner_user_id: other.user.id
    }));
  }
  f.storageData.set(pendingKey, JSON.stringify({ completion_id: completionId,
    module_id: 'practice-a5a', owner_user_id: owner.user.id }));
  await f.dashboard();
  assert.equal(f.requests.length, 1);
  assert.equal(f.storageData.size, 26);
});

test('dashboard stops owner replay when the active account changes between requests', async () => {
  const f = fixture({ responses: [() => { f.setSession(other); return response(); }] });
  for (let i = 0; i < 2; i += 1) {
    f.storageData.set(`toluxPendingLessonProgress:${i}`, JSON.stringify({
      completion_id: String(i), module_id: 'practice-a5a', owner_user_id: owner.user.id
    }));
  }
  await f.dashboard();
  assert.equal(f.requests.length, 1);
  assert.equal(f.storageData.has('toluxPendingLessonProgress:1'), true);
});
