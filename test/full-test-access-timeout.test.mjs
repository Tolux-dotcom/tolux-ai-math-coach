import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const helper = fs.readFileSync(new URL('../public/subscriber-access-client.js', import.meta.url), 'utf8');
const runner = fs.readFileSync(new URL('../public/test-prep.js', import.meta.url), 'utf8');
const session = token => ({ data: { session: { access_token: token } }, error: null });
const allowed = () => ({ status: 200, json: async () => ({ allowed: true, isSubscriber: true }) });

function fixture(phase) {
  let finish;
  let fetchCount = 0;
  let refreshCount = 0;
  let fired = 0;
  const deadlines = [];
  const requests = [];
  const stall = () => new Promise(resolve => { finish = resolve; });
  const client = { auth: {
    getSession: () => phase === 'session' ? stall() : Promise.resolve(session('initial-token')),
    refreshSession: () => { refreshCount++; return phase === 'refresh' ? stall() : Promise.resolve(session('fresh-token')); }
  } };
  const fetchImpl = (url, options) => {
    requests.push({ url, options });
    fetchCount++;
    if (phase === 'request' || (phase === 'refreshed-request' && fetchCount === 2)) return stall();
    if (['refresh', 'refreshed-request'].includes(phase) && fetchCount === 1) return Promise.resolve({ status: 401 });
    if (phase === 'body') return Promise.resolve({ status: 200, json: stall });
    return Promise.resolve(allowed());
  };
  const button = { disabled: false, textContent: 'Start Full Simulation' };
  const starts = [];
  const context = vm.createContext({ window: {}, fetch: fetchImpl, AbortController,
    getSupabaseClient: () => client, accessCheckPending: false,
    modeWrap: { querySelector: () => button }, modeMessage: { innerHTML: '', scrollIntoView() {} },
    startMode: mode => starts.push(mode), clearTimeout,
    setTimeout(callback, delay) {
      deadlines.push(delay);
      return setTimeout(() => { fired++; callback(); }, delay === 15000 ? 10 : delay);
    }
  });
  vm.runInContext(helper, context);
  vm.runInContext(runner.slice(runner.indexOf('async function verifyFullSimulationAccess('),
    runner.indexOf('function selectedAnswers(')), context);
  vm.runInContext(runner.slice(runner.indexOf('function setModeButtonPending('),
    runner.indexOf('function renderModeCards(')), context);
  return { context, button, starts, requests, client, deadlines, finish: value => finish(value),
    counts: () => ({ fetchCount, refreshCount }), fired: () => fired,
    recover() { phase = 'healthy'; client.auth.getSession = async () => session('retry-token'); } };
}

async function bounded(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Full Simulation access remained stalled')), 250);
  })]); } finally { clearTimeout(timer); }
}

for (const phase of ['session', 'request', 'refresh', 'refreshed-request', 'body']) {
  test(`Full Simulation stalled ${phase} fails closed, ignores late work and permits a fresh check`, async () => {
    const state = fixture(phase);
    await bounded(state.context.handleModeStart('full'));
    assert.deepEqual(state.starts, []);
    assert.equal(state.button.disabled, false);
    assert.equal(state.button.textContent, 'Start Full Simulation');
    assert.equal(state.context.accessCheckPending, false);
    assert.match(state.context.modeMessage.innerHTML, /Full Simulation access could not be verified/);
    assert.equal(state.fired(), 1);
    assert.deepEqual(state.deadlines, [15000], 'one shared deadline, not a new budget per stage');
    for (const request of state.requests) assert.equal(request.options.signal.aborted, true);
    const counts = state.counts();
    const message = state.context.modeMessage.innerHTML;
    // A late 401 must not start refresh; a late session/refresh must not start fetch.
    state.finish(['session', 'refresh'].includes(phase) ? session('late-token')
      : phase === 'body' ? { allowed: true, isSubscriber: true } : { status: 401 });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(state.counts(), counts);
    assert.deepEqual(state.starts, []);
    assert.equal(state.context.modeMessage.innerHTML, message);
    state.recover();
    await bounded(state.context.handleModeStart('full'));
    assert.deepEqual(state.starts, ['full']);
    assert.equal(state.button.disabled, false);
    assert.equal(state.requests.at(-1).options.headers.Authorization, 'Bearer retry-token');
  });
}

test('Full Simulation timely server authorization clears its deadline', async () => {
  const state = fixture('healthy');
  await bounded(state.context.handleModeStart('full'));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(state.fired(), 0);
  assert.deepEqual(state.starts, ['full']);
  assert.equal(state.requests[0].options.signal.aborted, false);
});

test('a late successful entitlement response cannot start Full Simulation after timeout', async () => {
  const state = fixture('request');
  await bounded(state.context.handleModeStart('full'));
  state.finish(allowed());
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(state.starts, []);
  assert.equal(state.context.accessCheckPending, false);
  assert.match(state.context.modeMessage.innerHTML, /Full Simulation access could not be verified/);
});
