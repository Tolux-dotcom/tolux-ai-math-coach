import test from 'node:test';
import assert from 'node:assert/strict';
import { persistPracticeCompletion } from '../public/practice-progress.mjs';

const owner = { access_token: 'student-a', user: { id: 'student-a' } };
const report = {
  owner_user_id: owner.user.id,
  completion_id: '97f36c84-0df0-4a41-8b42-f7dd26c7282b',
  module_id: 'practice-alg1-a5a-linear-equations',
  mastery_score: 100
};

for (const [label, storage] of [
  ['absent', undefined], ['null', null], ['without a write API', {}],
  ['quota-blocked', { setItem() { throw new Error('Quota exceeded'); } }]
]) {
  for (const success of [false, true]) {
    test(`${label} storage: ${success ? 'account save still succeeds' : 'no false queued-save claim'}`, async () => {
      let sends = 0;
      const result = await persistPracticeCompletion({
        report, storage,
        getSession: async () => owner,
        fetchImpl: async (url, options) => {
          sends++;
          assert.equal(url, '/api/lesson-progress');
          assert.equal(options.headers.Authorization, 'Bearer student-a');
          assert.deepEqual(JSON.parse(options.body), report);
          return { ok: success, status: success ? 200 : 503,
            async json() { return success ? { activity: report } : {}; } };
        }
      });
      assert.equal(sends, 1);
      assert.equal(result.synced, success);
      assert.equal(result.pendingSaved, false);
    });
  }
}

for (const success of [false, true]) {
  test(`blocked storage property: ${success ? 'account save still succeeds' : 'returns unsaved instead of rejecting'}`, async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError: storage disabled'); }
    });
    try {
      let sends = 0;
      const result = await persistPracticeCompletion({
        report, getSession: async () => owner,
        fetchImpl: async () => {
          sends++;
          return { ok: success, status: success ? 200 : 503,
            async json() { return success ? { activity: report } : {}; } };
        }
      });
      assert.equal(sends, 1);
      assert.equal(result.synced, success);
      assert.equal(result.pendingSaved, false);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      else delete globalThis.localStorage;
    }
  });
}

test('blocked storage never permits another account to submit the original result', async () => {
  let sends = 0;
  const result = await persistPracticeCompletion({
    report, storage: null,
    getSession: async () => ({ access_token: 'student-b', user: { id: 'student-b' } }),
    fetchImpl: async () => { sends++; assert.fail('Cross-account upload'); }
  });
  assert.equal(sends, 0);
  assert.equal(result.synced, false);
  assert.equal(result.pendingSaved, false);
  assert.equal(result.reason, 'original-account-required');
});
