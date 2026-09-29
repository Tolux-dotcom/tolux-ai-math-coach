import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MODE_TARGETS,
  assembleQuestions,
  createSession,
  randomizeQuestionChoices,
  recordResponse,
  scoreSession
} from '../public/test-prep-core.mjs';

const readJson = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const banks = {
  quick: readJson('../public/staar-algebra1-quick-check.json'),
  half: readJson('../public/staar-algebra1-half-test.json'),
  fullExtension: readJson('../public/staar-algebra1-full-extension.json')
};
const runnerSource = fs.readFileSync(
  new URL('../public/test-prep.js', import.meta.url),
  'utf8'
);
const html = fs.readFileSync(
  new URL('../public/test-prep.html', import.meta.url),
  'utf8'
);

function categoryCounts(questions) {
  return Object.fromEntries(
    Object.keys(MODE_TARGETS.full).map(category => [
      category,
      questions.filter(question => question.reporting_category === Number(category)).length
    ])
  );
}

test('assembles each Test Prep mode with its exact category and point totals', () => {
  const expectations = {
    quick: { questions: 10, points: 11 },
    half: { questions: 25, points: 29 },
    full: { questions: 50, points: 59 }
  };

  for (const [modeId, expected] of Object.entries(expectations)) {
    const questions = assembleQuestions(modeId, banks, () => 0.25);
    assert.equal(questions.length, expected.questions, `${modeId} question count`);
    assert.equal(
      questions.reduce((sum, question) => sum + question.points, 0),
      expected.points,
      `${modeId} point total`
    );
    assert.deepEqual(categoryCounts(questions), MODE_TARGETS[modeId]);
  }
});

test('choice randomization preserves single-select and multi-select answer meaning', () => {
  const single = randomizeQuestionChoices({
    id: 'single',
    choices: ['A', 'B', 'C', 'D'],
    answer: [2]
  }, () => 0);
  assert.deepEqual(single.choices, ['B', 'C', 'D', 'A']);
  assert.deepEqual(single.answer, [1]);
  assert.equal(single.choices[single.answer[0]], 'C');

  const multiple = randomizeQuestionChoices({
    id: 'multiple',
    choices: ['A', 'B', 'C', 'D'],
    answer: [0, 2]
  }, () => 0);
  assert.deepEqual(multiple.answer, [1, 3]);
  assert.deepEqual(multiple.answer.map(index => multiple.choices[index]), ['C', 'A']);
});

test('starting another mode creates a clean session instead of retaining prior state', () => {
  const quickQuestions = assembleQuestions('quick', banks, () => 0.4);
  const quick = createSession('quick', quickQuestions, 1000);
  recordResponse(quick, quick.questions[0].answer);
  quick.currentIndex = 6;

  const full = createSession('full', assembleQuestions('full', banks, () => 0.6), 2000);
  assert.equal(full.modeId, 'full');
  assert.equal(full.currentIndex, 0);
  assert.equal(full.responses.size, 0);
  assert.equal(full.startedAt, 2000);
  assert.notEqual(full.questions, quick.questions);
});

test('the shared scorer handles points, category totals, misses, and persistence records', () => {
  const questions = [
    {
      id: 'q1', reporting_category: 1, teks: 'A.2A', points: 1,
      choices: ['1', '2'], answer: [1]
    },
    {
      id: 'q2', reporting_category: 1, teks: 'A.2B', points: 2,
      choices: ['A', 'B', 'C'], answer: [0, 2]
    },
    {
      id: 'q3', reporting_category: 2, teks: 'A.3A', points: 1,
      choices: ['x', 'y'], answer: [0]
    }
  ];
  const session = createSession('quick', questions);
  session.responses.set('q1', [1]);
  session.responses.set('q2', [0, 1]);
  session.responses.set('q3', [0]);

  const score = scoreSession(session);
  assert.equal(score.earned, 2);
  assert.equal(score.possible, 4);
  assert.equal(score.percent, 50);
  assert.deepEqual(score.categoryTotals.get(1), { earned: 1, possible: 3 });
  assert.deepEqual(score.categoryTotals.get(2), { earned: 1, possible: 1 });
  assert.deepEqual(score.misses.map(miss => miss.question.id), ['q2']);
  assert.deepEqual(score.itemRecords, [
    { item_id: 'q1', first_attempt_correct: true, first_error_tag: null },
    { item_id: 'q2', first_attempt_correct: false, first_error_tag: 'A.2B' },
    { item_id: 'q3', first_attempt_correct: true, first_error_tag: null }
  ]);
});

test('the page loads one unified runner with one control-listener set', () => {
  assert.match(html, /type="module" src="\/test-prep\.js"/);
  assert.doesNotMatch(html, /test-prep-full\.js/);
  assert.equal((runnerSource.match(/nextButton\?\.addEventListener/g) || []).length, 1);
  assert.equal((runnerSource.match(/submitButton\?\.addEventListener/g) || []).length, 1);
  assert.equal((runnerSource.match(/retakeButton\?\.addEventListener/g) || []).length, 1);
  assert.doesNotMatch(runnerSource, /fullActive/);
});
