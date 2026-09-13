import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGrowthEvent } from '../growth-analytics.mjs';

test('accepts allowed app events and strips unsafe properties', () => {
  const event = normalizeGrowthEvent({
    eventName: 'upgrade_clicked',
    plan: 'student',
    properties: { surface: 'trial_paywall', long_value: 'x'.repeat(300), nested: { no: true }, 'bad key': 'drop me' }
  });
  assert.equal(event.eventName, 'upgrade_clicked');
  assert.equal(event.plan, 'student');
  assert.equal(event.source, 'app');
  assert.equal(event.properties.surface, 'trial_paywall');
  assert.equal(event.properties.long_value.length, 160);
  assert.equal('nested' in event.properties, false);
  assert.equal('bad key' in event.properties, false);
});

test('accepts NSF-relevant learning engagement events', () => {
  for (const eventName of [
    'lesson_completed',
    'practice_started',
    'practice_completed',
    'help_requested',
    'explain_another_way',
    'similar_problem_requested',
    'full_solution_requested'
  ]) {
    const event = normalizeGrowthEvent({ eventName, properties: { module: 'alg1-a5a', surface: 'test' } });
    assert.equal(event.eventName, eventName);
    assert.equal(event.source, 'app');
  }
});

test('rejects unsupported browser events', () => {
  assert.throws(() => normalizeGrowthEvent({ eventName: 'subscription_activated' }), /Unsupported growth event/);
});

test('accepts Stripe lifecycle events only when server marks the source Stripe', () => {
  const event = normalizeGrowthEvent({ eventName: 'subscription_activated', plan: 'family' }, { source: 'stripe' });
  assert.equal(event.source, 'stripe');
});

test('rejects unknown plans', () => {
  assert.throws(() => normalizeGrowthEvent({ eventName: 'checkout_started', plan: 'enterprise' }), /Unsupported Tolux plan/);
});
