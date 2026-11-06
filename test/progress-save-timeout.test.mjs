import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { persistPracticeCompletion } from '../public/practice-progress.mjs';

const owner = { access_token: 'student-a', user: { id: 'student-a' } };
const report = { owner_user_id: 'student-a', module_id: 'practice-alg1-a5a',
  completion_id: '97f36c84-0df0-4a41-8b42-f7dd26c7282b', mastery_score: 100 };
const pendingKey = `toluxPendingLessonProgress:${report.completion_id}`;
const never = () => new Promise(() => {});
const success = () => ({ ok: true, status: 200, async json() { return { activity: report }; } });

function fixture() {
  const data = new Map();
  return { data, storage: {
    setItem(k, v) { data.set(k, v); }, removeItem(k) { data.delete(k); }
  } };
}

async function bounded(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Save did not settle within the test deadline')), 250);
    })]);
  } finally { clearTimeout(timer); }
}

for (const stage of ['request', 'body']) {
  test(`stalled ${stage} times out, aborts, preserves the exact result, and permits same-attempt retry`, async () => {
    const f = fixture();
    let stalled = true, signal;
    const bodies = [];
    const options = {
      report, storage: f.storage, getSession: async () => owner, requestTimeoutMs: 10,
      fetchImpl: async (_url, init) => {
        bodies.push(init.body); signal = init.signal;
        if (!stalled) return success();
        return stage === 'request' ? never() : { ok: true, status: 200, json: never };
      }
    };
    const result = await bounded(persistPracticeCompletion(options));
    assert.equal(result.synced, false);
    assert.equal(result.pendingSaved, true);
    assert.match(result.reason, /timed out/i);
    assert.equal(signal.aborted, true);
    assert.equal(f.data.get(pendingKey), JSON.stringify(report));
    stalled = false;
    assert.equal((await persistPracticeCompletion(options)).synced, true);
    assert.deepEqual(bodies, [JSON.stringify(report), JSON.stringify(report)]);
    assert.equal(f.data.has(pendingKey), false);
  });
}

test('timeout with unavailable device storage never claims a recoverable queue', async () => {
  const result = await bounded(persistPracticeCompletion({ report, storage: null,
    getSession: async () => owner, requestTimeoutMs: 10, fetchImpl: never }));
  assert.equal(result.synced, false);
  assert.equal(result.pendingSaved, false);
  assert.match(result.reason, /timed out/i);
});

test('401 refresh gets one bounded same-owner retry, not an unbounded save', async () => {
  const f = fixture(); let calls = 0, refreshes = 0;
  const result = await bounded(persistPracticeCompletion({ report, storage: f.storage,
    getSession: async () => owner, requestTimeoutMs: 10,
    refreshSession: async () => { refreshes++; return owner; },
    fetchImpl: async () => ++calls === 1 ? { ok: false, status: 401, async json() { return {}; } } : never()
  }));
  assert.equal(result.synced, false);
  assert.equal(result.pendingSaved, true);
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
});

test('late success after timeout cannot clear the queue or reassign the result', async () => {
  const f = fixture(); let resolveRequest, calls = 0;
  const opts = { report, storage: f.storage, requestTimeoutMs: 10,
    getSession: async () => owner,
    fetchImpl: () => { calls++; return new Promise(resolve => { resolveRequest = resolve; }); }
  };
  assert.equal((await bounded(persistPracticeCompletion(opts))).synced, false);
  resolveRequest(success());
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(f.data.has(pendingKey), true);
  const other = { access_token: 'student-b', user: { id: 'student-b' } };
  assert.equal((await persistPracticeCompletion({ ...opts, getSession: async () => other })).synced, false);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(f.data.get(pendingKey)).owner_user_id, 'student-a');
});

test('successful save clears its deadline without a later abort', async () => {
  const f = fixture(); let signal;
  const result = await persistPracticeCompletion({ report, storage: f.storage,
    getSession: async () => owner, requestTimeoutMs: 10,
    fetchImpl: async (_url, init) => { signal = init.signal; return success(); }
  });
  assert.equal(result.synced, true);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(signal.aborted, false);
  assert.equal(f.data.has(pendingKey), false);
});

test('native HTTP fetch abort preserves the result and a connected retry saves the same completion', async () => {
  const f = fixture();
  let delayed = true;
  const timers = new Set(), bodies = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    bodies.push(body);
    const reply = () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ activity: report }));
    };
    if (delayed) {
      const timer = setTimeout(() => { timers.delete(timer); reply(); }, 200);
      timers.add(timer);
    } else reply();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/lesson-progress`;
    const options = { report, storage: f.storage, getSession: async () => owner,
      requestTimeoutMs: 50, fetchImpl: (_path, init) => fetch(url, init) };
    const result = await bounded(persistPracticeCompletion(options));
    assert.equal(result.synced, false);
    assert.match(result.reason, /timed out/i);
    assert.equal(f.data.has(pendingKey), true);
    delayed = false;
    assert.equal((await persistPracticeCompletion({ ...options, requestTimeoutMs: 200 })).synced, true);
    assert.equal(f.data.has(pendingKey), false);
    assert.ok(bodies.length >= 1);
    assert.ok(bodies.every(body => body === JSON.stringify(report)));
  } finally {
    for (const timer of timers) clearTimeout(timer);
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
