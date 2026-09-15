import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bank = JSON.parse(
  await readFile(new URL('../public/staar-algebra1-quick-check.json', import.meta.url), 'utf8')
);

function numericChoiceValue(choice) {
  const match = /^x\s*=\s*(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?$/.exec(choice);
  assert.ok(match, `Expected a numeric x-value choice, received: ${choice}`);
  const numerator = Number(match[1]);
  const denominator = match[2] === undefined ? 1 : Number(match[2]);
  assert.notEqual(denominator, 0, `Choice must not divide by zero: ${choice}`);
  return numerator / denominator;
}

test('Quick Check preserves its published structure and valid answer indices', () => {
  assert.equal(bank.questions.length, 10);
  assert.equal(bank.questions.reduce((total, question) => total + question.points, 0), 11);
  assert.equal(new Set(bank.questions.map(question => question.id)).size, bank.questions.length);

  const categoryCounts = bank.questions.reduce((counts, question) => {
    counts[question.reporting_category] = (counts[question.reporting_category] || 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(categoryCounts, { 1: 2, 2: 2, 3: 3, 4: 2, 5: 1 });

  for (const question of bank.questions) {
    assert.ok(question.prompt || question.prompt_html, `${question.id} needs a prompt`);
    assert.ok(question.teks, `${question.id} needs a TEKS expectation`);
    assert.ok(question.module_id, `${question.id} needs a remediation module`);
    assert.ok(question.rationale, `${question.id} needs a rationale`);
    assert.ok(Array.isArray(question.choices) && question.choices.length >= 2);
    assert.ok(Array.isArray(question.answer) && question.answer.length >= 1);
    assert.equal(new Set(question.choices).size, question.choices.length, `${question.id} has duplicate choice text`);

    for (const answerIndex of question.answer) {
      assert.ok(Number.isInteger(answerIndex), `${question.id} has a non-integer answer index`);
      assert.ok(answerIndex >= 0 && answerIndex < question.choices.length, `${question.id} has an out-of-range answer index`);
    }

    if (question.type === 'multiple_choice') assert.equal(question.answer.length, 1);
    if (question.type === 'multi_select') assert.ok(question.answer.length >= 2);
  }
});

test('Quick Check question 5 has exactly one mathematically correct choice', () => {
  const question = bank.questions.find(candidate => candidate.id === 'qc5');
  assert.ok(question, 'qc5 must exist');
  assert.equal(question.prompt, 'Solve 4(2x - 3) + 5 = 3x + 18.');

  const values = question.choices.map(numericChoiceValue);
  assert.equal(new Set(values).size, values.length, 'qc5 choices must be mathematically distinct');

  const satisfyingIndices = values
    .map((x, index) => ({ index, residual: 4 * (2 * x - 3) + 5 - (3 * x + 18) }))
    .filter(candidate => Math.abs(candidate.residual) < 1e-9)
    .map(candidate => candidate.index);

  assert.deepEqual(satisfyingIndices, question.answer);
  assert.equal(question.choices[question.answer[0]], 'x = 5');
});
