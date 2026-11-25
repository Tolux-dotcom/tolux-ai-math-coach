import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/test-prep.js', import.meta.url), 'utf8');
function fixture({ protect = true, discard = false } = {}) {
  const input = { completionId: 'original', originalOwnerId: 'student-1', percent: 70 };
  const originalSession = { modeId: 'quick' };
  const prompts = [];
  const listeners = {};
  const context = vm.createContext({
    resultNeedsProtection: protect, lastSaveInput: input, session: originalSession,
    window: { confirm: text => { prompts.push(text); return discard; },
      addEventListener: (name, handler) => { listeners[name] = handler; } },
    saveStatus: { textContent: 'Not saved' }, retrySaveButton: { hidden: false },
    modeMessage: { textContent: '' }, results: { hidden: false }, runner: { hidden: true, scrollIntoView() {} },
    createSession: modeId => ({ modeId }), assembleQuestions: () => [], banks: {}, renderQuestion() {}
  });
  vm.runInContext(source.slice(source.indexOf('function startMode('), source.indexOf('function setModeButtonPending(')), context);
  const guardStart = source.indexOf("window.addEventListener('beforeunload'");
  if (guardStart >= 0) vm.runInContext(source.slice(guardStart, source.indexOf('\ntry {', guardStart)), context);
  return { context, input, originalSession, prompts, listeners };
}

for (const mode of ['quick', 'half', 'full']) {
  test(`cancel replacing an unconfirmed result with ${mode} preserves result and retry`, () => {
    const state = fixture();
    state.context.startMode(mode);
    assert.equal(state.context.lastSaveInput, state.input);
    assert.equal(state.context.session, state.originalSession);
    assert.equal(state.context.retrySaveButton.hidden, false);
    assert.equal(state.context.saveStatus.textContent, 'Not saved');
    assert.equal(state.context.results.hidden, false);
    assert.equal(state.context.runner.hidden, true);
    assert.equal(state.prompts.length, 1);
    assert.match(state.prompts[0], /not confirmed saved/i);
  });
}

test('explicitly discarding the same-page retry permits a new test', () => {
  const state = fixture({ discard: true });
  state.context.startMode('half');
  assert.equal(state.prompts.length, 1);
  assert.equal(state.context.lastSaveInput, null);
  assert.equal(state.context.resultNeedsProtection, false);
  assert.equal(state.context.session.modeId, 'half');
});

test('a confirmed result starts another mode without prompting', () => {
  const state = fixture({ protect: false });
  state.context.startMode('full');
  assert.equal(state.prompts.length, 0);
  assert.equal(state.context.session.modeId, 'full');
});

test('page exit warns only while the result is unconfirmed', () => {
  const state = fixture();
  assert.equal(typeof state.listeners.beforeunload, 'function');
  let prevented = 0;
  const event = { preventDefault() { prevented++; } };
  state.listeners.beforeunload(event);
  assert.equal(prevented, 1);
  assert.equal(event.returnValue, true);
  state.context.resultNeedsProtection = false;
  const safeEvent = { preventDefault() { prevented++; } };
  state.listeners.beforeunload(safeEvent);
  assert.equal(prevented, 1);
  assert.equal(safeEvent.returnValue, undefined);
});

test('only a confirmed save releases protection and each new result arms it immediately', async () => {
  const state = fixture();
  Object.assign(state.context, { saveInFlight: false, console: { error() {} } });
  vm.runInContext(source.slice(source.indexOf('function testPrepSaveMessage('), source.indexOf('function persistResult(')), state.context);
  for (const status of ['queued', 'unsaved', 'local-only', 'session-unavailable', 'original-account-required', 'synced']) {
    state.context.window.toluxTestPrepProgress = { save: async () => ({ status,
      originalOwnerId: 'student-1', report: { completion_id: 'original', completed_at: '2026-11-25T14:00:00Z' } }) };
    await state.context.saveLastResult();
    assert.equal(state.context.resultNeedsProtection, status !== 'synced');
  }
  // Starting a fresh completed result must immediately arm the guard, before saving resolves.
  let finish;
  state.context.window.toluxTestPrepProgress.save = () => new Promise(resolve => { finish = resolve; });
  vm.runInContext(source.slice(source.indexOf('function persistResult('), source.indexOf('function scoreTest(')), state.context);
  state.context.persistResult(80, [{ item_id: 'q1' }]);
  assert.equal(state.context.resultNeedsProtection, true);
  finish({ status: 'synced', report: { completion_id: 'new', completed_at: '2026-11-25T14:01:00Z' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.context.resultNeedsProtection, false);
});

test('a late synced response for an older result cannot release the newer result guard', async () => {
  const state = fixture();
  let finishOld;
  let finishNew;
  let calls = 0;
  Object.assign(state.context, { saveInFlight: false, console: { error() {} } });
  state.context.window.toluxTestPrepProgress = { save: () => new Promise(resolve => {
    if (++calls === 1) finishOld = resolve;
    else finishNew = resolve;
  }) };
  vm.runInContext(source.slice(source.indexOf('function testPrepSaveMessage('), source.indexOf('function persistResult(')), state.context);
  const pending = state.context.saveLastResult();
  state.context.lastSaveInput = { completionId: 'new-result' };
  finishOld({ status: 'synced', report: { completion_id: 'original' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls, 2);
  assert.equal(state.context.resultNeedsProtection, true);
  finishNew({ status: 'queued', report: { completion_id: 'new-result' } });
  await pending;
  assert.equal(state.context.resultNeedsProtection, true);
});
