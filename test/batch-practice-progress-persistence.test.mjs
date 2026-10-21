import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createPracticeCompletionId,
  persistPracticeCompletion
} from '../public/practice-progress.mjs';

const owner = { access_token: 'owner-token', user: { id: 'owner-a' } };
const other = { access_token: 'other-token', user: { id: 'owner-b' } };
const completionId = '123e4567-e89b-42d3-a456-426614174000';
const pendingKey = `toluxPendingLessonProgress:${completionId}`;
const moduleKey = 'toluxLessonProgress:practice-alg1-a2a-domain-range';

function report() {
  return {
    completion_id: completionId,
    module_id: 'practice-alg1-a2a-domain-range',
    owner_user_id: owner.user.id,
    mastery_score: 80,
    item_records: []
  };
}

function response(status = 200, activity = { mastery_score: 80 }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() { return activity ? { activity } : { error: 'Unavailable' }; }
  };
}

function fixture({ initial = owner, refreshed = { ...owner, access_token: 'fresh-token' }, responses = [], storageFailure = false } = {}) {
  let active = initial;
  let refreshes = 0;
  const data = new Map();
  const requests = [];
  const storage = {
    getItem(key) { return data.get(key) || null; },
    setItem(key, value) { if (storageFailure) throw new Error('Storage unavailable'); data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
  return {
    data,
    requests,
    storage,
    setActive(value) { active = value; },
    get refreshes() { return refreshes; },
    async save() {
      return persistPracticeCompletion({
        report: report(),
        storage,
        getSession: async () => active,
        refreshSession: async () => {
          refreshes += 1;
          active = refreshed;
          return active;
        },
        fetchImpl: async (url, options) => {
          const index = requests.length;
          requests.push({ url, options });
          return responses[index] ? responses[index](this) : response();
        }
      });
    }
  };
}

test('fallback completion identifiers remain valid UUID v4 values', () => {
  const id = createPracticeCompletionId({}, () => 0.25);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('a Batch Practice result is queued before sending and cleared only after owner-confirmed success', async () => {
  const f = fixture({ responses: [current => {
    assert.equal(JSON.parse(current.data.get(pendingKey)).owner_user_id, owner.user.id);
    return response();
  }] });
  const result = await f.save();
  assert.equal(result.synced, true);
  assert.equal(f.requests.length, 1);
  assert.equal(JSON.parse(f.requests[0].options.body).owner_user_id, owner.user.id);
  assert.equal(f.data.has(pendingKey), false);
  assert.equal(JSON.parse(f.data.get(moduleKey)).owner_user_id, owner.user.id);
});

test('signed-out completion stays queued without making a progress request', async () => {
  const f = fixture({ initial: null });
  const result = await f.save();
  assert.equal(result.synced, false);
  assert.equal(result.reason, 'original-account-required');
  assert.equal(f.requests.length, 0);
  assert.equal(JSON.parse(f.data.get(pendingKey)).owner_user_id, owner.user.id);
});

test('offline and non-success responses keep the original completion queued', async t => {
  await t.test('offline', async () => {
    const f = fixture({ responses: [() => { throw new Error('Offline'); }] });
    const result = await f.save();
    assert.equal(result.synced, false);
    assert.equal(f.data.has(pendingKey), true);
  });
  await t.test('server failure', async () => {
    const f = fixture({ responses: [() => response(503, null)] });
    const result = await f.save();
    assert.equal(result.synced, false);
    assert.equal(f.data.has(pendingKey), true);
  });
});

test('shared persistence distinguishes an unavailable device queue from an offline queued result', async () => {
  const f = fixture({ storageFailure: true, responses: [() => { throw new Error('Offline'); }] });
  const result = await f.save();
  assert.equal(result.synced, false);
  assert.equal(result.pendingSaved, false);
  assert.equal(f.data.size, 0);
});

test('a 401 retries once with the refreshed token for the same owner', async () => {
  const f = fixture({ responses: [() => response(401, null), () => response()] });
  const result = await f.save();
  assert.equal(result.synced, true);
  assert.equal(f.refreshes, 1);
  assert.deepEqual(
    f.requests.map(request => request.options.headers.Authorization),
    ['Bearer owner-token', 'Bearer fresh-token']
  );
  assert.equal(f.data.has(pendingKey), false);
});

test('a repeated 401 makes no third request and retains the recovery record', async () => {
  const f = fixture({ responses: [() => response(401, null), () => response(401, null)] });
  const result = await f.save();
  assert.equal(result.synced, false);
  assert.equal(f.requests.length, 2);
  assert.equal(f.data.has(pendingKey), true);
});

test('switching accounts after a request cannot erase or reattribute the completion', async () => {
  const f = fixture({ responses: [current => {
    current.setActive(other);
    return response();
  }] });
  const result = await f.save();
  assert.equal(result.synced, false);
  assert.equal(result.reason, 'account-changed');
  assert.equal(JSON.parse(f.data.get(pendingKey)).owner_user_id, owner.user.id);
});

test('a token refresh that returns another account cannot retry the completion', async () => {
  const f = fixture({ refreshed: other, responses: [() => response(401, null)] });
  const result = await f.save();
  assert.equal(result.synced, false);
  assert.equal(f.requests.length, 1);
  assert.equal(f.data.has(pendingKey), true);
});

test('an account switch during response parsing retains the pending result', async () => {
  const f = fixture({ responses: [current => ({
    status: 200,
    ok: true,
    async json() {
      current.setActive(other);
      return { activity: { mastery_score: 80 } };
    }
  })] });
  const result = await f.save();
  assert.equal(result.synced, false);
  assert.equal(f.data.has(pendingKey), true);
});

test('all 23 Batch 5–9 skills use the shared owner-safe completion path', () => {
  const files = [5, 6, 7, 8, 9].map(batch =>
    new URL(`../public/batch${batch}-practice.js`, import.meta.url)
  );
  let mappedSkills = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    mappedSkills += new Set(source.match(/'A\.\d+[A-Z]'/g) || []).size;
    assert.match(source, /from '\.\/practice-progress\.mjs'/);
    assert.match(source, /owner_user_id:practiceOwnerId/);
    assert.match(source, /getSession:auth,refreshSession:refreshAuth/);
    assert.match(source, /const \w+=await auth\(\);[\s\S]*?counted\.has/);
    assert.match(source, /completion-save-status/);
    assert.match(source, /pendingSaved/);
    assert.match(source, /Progress could not be saved to your account or this device/);
    assert.doesNotMatch(source, /fetch\('\/api\/lesson-progress'/);
    assert.doesNotMatch(source, /completion_id:crypto\.randomUUID/);
  }
  assert.equal(mappedSkills, 23);

  const packageSource = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  for (const asset of ['practice-progress.mjs', ...[5, 6, 7, 8, 9].map(n => `batch${n}-practice.js`)]) {
    assert.match(packageSource, new RegExp(`node --check public/${asset.replace('.', '\\.')}`));
  }
});
