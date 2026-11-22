import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/test-prep.js', import.meta.url), 'utf8');
function fixture(getSession, missingClient = false) {
  const button = { disabled: false, textContent: 'Start Half Test' };
  const starts = [];
  const client = { auth: { getSession } };
  const window = { supabase: { createClient: () => missingClient ? null : client } };
  let fired = 0;
  const context = vm.createContext({ window, SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dummy', accessCheckPending: false,
    modeWrap: { querySelector: () => button }, modeMessage: { innerHTML: '', scrollIntoView() {} },
    startMode: mode => starts.push(mode), clearTimeout,
    setTimeout(callback, delay) { return setTimeout(() => { fired++; callback(); }, delay === 15000 ? 10 : delay); }
  });
  vm.runInContext(source.slice(source.indexOf('function getSupabaseClient('),
    source.indexOf('function selectedAnswers(')), context);
  vm.runInContext(source.slice(source.indexOf('function setModeButtonPending('),
    source.indexOf('function renderModeCards(')), context);
  return { context, client, window, button, starts, fired: () => fired };
}
async function bounded(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Half Test access remained stalled')), 250);
  })]); } finally { clearTimeout(timer); }
}

for (const failure of ['timeout', 'error', 'rejection', 'missing-client']) {
  test(`Half Test ${failure} fails closed, releases its button and permits a fresh check`, async () => {
    let finish;
    const lookup = failure === 'timeout' ? () => new Promise(resolve => { finish = resolve; })
      : failure === 'error' ? async () => ({ data: { session: null }, error: new Error('Unavailable') })
        : async () => { throw new Error('Unavailable'); };
    const state = fixture(lookup, failure === 'missing-client');
    await bounded(state.context.handleModeStart('half'));
    assert.deepEqual(state.starts, []);
    assert.equal(state.button.disabled, false);
    assert.equal(state.button.textContent, 'Start Half Test');
    assert.equal(state.context.accessCheckPending, false);
    assert.match(state.context.modeMessage.innerHTML, /Half Test access could not be verified/i);
    assert.doesNotMatch(state.context.modeMessage.innerHTML, /create a free account/i);
    const message = state.context.modeMessage.innerHTML;
    finish?.({ data: { session: { user: { id: 'late-student' } } } });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(state.starts, []);
    assert.equal(state.context.modeMessage.innerHTML, message);
    state.window.__toluxTestPrepSupabase = { auth: { getSession: async () => ({
      data: { session: { user: { id: 'student-1' } } }, error: null
    }) } };
    await bounded(state.context.handleModeStart('half'));
    assert.deepEqual(state.starts, ['half']);
    assert.equal(state.button.disabled, false);
  });
}

test('confirmed signed-out Half Test still requires a free account', async () => {
  const state = fixture(async () => ({ data: { session: null }, error: null }));
  await state.context.handleModeStart('half');
  assert.deepEqual(state.starts, []);
  assert.match(state.context.modeMessage.innerHTML, /Free account required/);
  assert.equal(state.button.disabled, false);
});

test('successful Half Test check clears its timer and Quick Check remains ungated', async () => {
  const state = fixture(async () => ({ data: { session: { user: { id: 'student-1' } } }, error: null }));
  await state.context.handleModeStart('half');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(state.fired(), 0);
  await state.context.handleModeStart('quick');
  assert.deepEqual(state.starts, ['half', 'quick']);
});
