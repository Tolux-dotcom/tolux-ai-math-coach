import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/test-prep.js', import.meta.url), 'utf8');

for (const [label, unavailable] of [['missing helper', undefined], ['missing save method', {}], ['non-callable save', { save: true }]]) {
  test(`Test Prep ${label} shows unsaved feedback and preserves retry input`, async () => {
    const input = { modeId: 'quick', percent: 70, itemRecords: [{ item_id: 'q1', correct: true }],
      startedAt: '2026-11-24T14:00:00Z', completionId: 'original-completion',
      completedAt: '2026-11-24T14:03:00Z', originalOwnerId: 'original-student' };
    const original = JSON.stringify(input);
    const errors = [];
    const context = vm.createContext({
      window: { toluxTestPrepProgress: unavailable },
      saveStatus: { textContent: '' }, retrySaveButton: { hidden: true, disabled: false },
      lastSaveInput: input, saveInFlight: false, console: { error: (...args) => errors.push(args) }
    });
    vm.runInContext(source.slice(source.indexOf('function testPrepSaveMessage('),
      source.indexOf('function persistResult(')), context);
    await context.saveLastResult();
    assert.match(context.saveStatus.textContent, /Progress could not be saved/);
    assert.match(context.saveStatus.textContent, /Keep this page open/);
    assert.doesNotMatch(context.saveStatus.textContent, /Saved to|Saved on this device/);
    assert.equal(context.retrySaveButton.hidden, false);
    assert.equal(context.retrySaveButton.disabled, false);
    assert.equal(context.saveInFlight, false);
    assert.equal(context.lastSaveInput, input);
    assert.equal(JSON.stringify(input), original);
    // Repeated Retry while unavailable must not erase the pending result or fail silently.
    await context.saveLastResult({ retrying: true });
    assert.equal(context.retrySaveButton.hidden, false);
    assert.equal(context.saveInFlight, false);
    assert.equal(JSON.stringify(context.lastSaveInput), original);
    assert.equal(errors.length, 2);
    const calls = [];
    context.window.toluxTestPrepProgress = { save: async actual => {
      calls.push(actual);
      return { status: 'synced', originalOwnerId: actual.originalOwnerId,
        report: { completion_id: actual.completionId, completed_at: actual.completedAt } };
    } };
    await context.saveLastResult({ retrying: true });
    assert.deepEqual(calls, [input]);
    assert.equal(JSON.stringify(input), original);
    assert.equal(context.saveStatus.textContent, 'Saved to your Tolux progress dashboard.');
    assert.equal(context.retrySaveButton.hidden, true);
    assert.equal(context.retrySaveButton.disabled, false);
    assert.equal(context.saveInFlight, false);
  });
}
