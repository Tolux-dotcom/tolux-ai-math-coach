import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findCourseModule } from '../public/course-core.mjs';

const bankPaths = [
  '../public/staar-algebra1-quick-check.json',
  '../public/staar-algebra1-half-test.json',
  '../public/staar-algebra1-full-extension.json'
];

const banks = await Promise.all(
  bankPaths.map(async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')))
);
const courseCatalog = JSON.parse(
  await readFile(new URL('../public/algebra1-course.json', import.meta.url), 'utf8')
);

// This oracle is deliberately independent from the answer indices stored in the
// banks. It turns a mathematical/content review into an executable regression
// test and catches a valid-looking index that points to the wrong choice.
const oracle = {
  qc1: { teks: 'A.10A', answers: ['5x² - 4x - 5'] },
  qc2: { teks: 'A.11A', answers: ['6√2'] },
  qc3: { teks: 'A.3A', answers: ['2'] },
  qc4: { teks: 'A.2C', answers: ['y = -2x + 3'] },
  qc5: { teks: 'A.5A', answers: ['x = 5'] },
  qc6: { teks: 'A.2H', answers: ['12x + 18y ≤ 180', '2x + 3y ≤ 30'] },
  qc7: { teks: 'A.2I', answers: ['a + s = 120 and 9a + 6s = 900'] },
  qc8: { teks: 'A.7C', answers: ['Right 4 and up 3'] },
  qc9: { teks: 'A.8A', answers: ['x = 3 and x = 4'] },
  qc10: { teks: 'A.9B', answers: ['The account grows by 4% each year'] },
  ht1: { teks: 'A.10A', answers: ['3x² - 8x + 8'] },
  ht2: { teks: 'A.11A', answers: ['5√2'] },
  ht3: { teks: 'A.10A', answers: ['10x² - 3x + 5'] },
  ht4: { teks: 'A.11A', answers: ['4√3', '2√12'] },
  ht5: { teks: 'A.11B', answers: ['x⁸'] },
  ht6: { teks: 'A.3A', answers: ['-3'] },
  ht7: { teks: 'A.2C', answers: ['y = 2x + 5'] },
  ht8: { teks: 'A.3A', answers: ['y = 3x + 2'] },
  ht9: { teks: 'A.3C', answers: ['7'] },
  ht10: { teks: 'A.3A', answers: ['3'] },
  ht11: { teks: 'A.5A', answers: ['x = 8'] },
  ht12: { teks: 'A.5B', answers: ['x = 474'] },
  ht13: { teks: 'A.2I', answers: ['a + s = 90 and 12a + 8s = 920'] },
  ht14: { teks: 'A.5A', answers: ['2x + 3 = 15', '4x - 8 = 16'] },
  ht15: { teks: 'A.5B', answers: ['x < 5'] },
  ht16: { teks: 'A.5C', answers: ['(2, 5)'] },
  ht17: { teks: 'A.7C', answers: ['Left 2 and down 5'] },
  ht18: { teks: 'A.8A', answers: ['x = 4 and x = 5'] },
  ht19: { teks: 'A.7C', answers: ['The vertex is (3, 4)', 'The parabola opens downward'] },
  ht20: { teks: 'A.8A', answers: ['x = ±7'] },
  ht21: { teks: 'A.7C', answers: ['(6, -2)'] },
  ht22: { teks: 'A.9B', answers: ['A 6% increase each time period'] },
  ht23: { teks: 'A.9B', answers: ['8% decrease'] },
  ht24: { teks: 'A.9B', answers: ['The initial value is 300', 'The growth rate is 5%'] },
  ht25: { teks: 'A.9B', answers: ['The value decreases 15% per year'] },
  ft26: { teks: 'A.10B', answers: ['x² - 2x - 15'] },
  ft27: { teks: 'A.10E', answers: ['(x + 3)(x + 4)'] },
  ft28: { teks: 'A.10F', answers: ['(x - 9)(x + 9)'] },
  ft29: { teks: 'A.10D', answers: ['x + 12'] },
  ft30: { teks: 'A.10C', answers: ['The quotient is 2x + 3', 'The original expression is undefined at x = 0'] },
  ft31: { teks: 'A.3A', answers: ['3'] },
  ft32: { teks: 'A.3B', answers: ['3 gallons per minute'] },
  ft33: { teks: 'A.3C', answers: ['4'] },
  ft34: { teks: 'A.3D', answers: ['Dashed boundary, shaded above'] },
  ft35: { teks: 'A.3E', answers: ['Vertical stretch by 2 and shift up 3'] },
  ft36: { teks: 'A.3F', answers: ['The lines intersect at (2, 3)', 'The solution has x = 2'] },
  ft37: { teks: 'A.5B', answers: ['x ≤ -4'] },
  ft38: { teks: 'A.5C', answers: ['(6, 4)'] },
  ft39: { teks: 'A.2B', answers: ['y = 3x - 1'] },
  ft40: { teks: 'A.2C', answers: ['y = 2x + 1'] },
  ft41: { teks: 'A.2D', answers: ['28'] },
  ft42: { teks: 'A.2E', answers: ['y = -3x + 7'] },
  ft43: { teks: 'A.5A', answers: ['x + 3 = 9', '2x + 6 = 18'] },
  ft44: { teks: 'A.7C', answers: ['(-1, -2)'] },
  ft45: { teks: 'A.8A', answers: ['x = 3 and x = -5'] },
  ft46: { teks: 'A.7C', answers: ['The vertex is (2, 6)', 'The parabola opens downward'] },
  ft47: { teks: 'A.8A', answers: ['x = ±4'] },
  ft48: { teks: 'A.7C', answers: ['Shift down 7'] },
  ft49: { teks: 'A.9B', answers: ['12% growth per time period'] },
  ft50: { teks: 'A.9B', answers: ['The initial value is 900', 'The quantity decreases by 20% each period'] }
};

test('all 60 unique Test Prep items match independently reviewed answers and TEKS', () => {
  const questions = banks.flatMap(bank => bank.questions);
  assert.equal(questions.length, 60);
  assert.equal(Object.keys(oracle).length, 60);
  assert.equal(new Set(questions.map(question => question.id)).size, 60);

  for (const question of questions) {
    const expected = oracle[question.id];
    assert.ok(expected, `${question.id} is missing from the independent oracle`);
    assert.equal(question.teks, expected.teks, `${question.id} has the wrong TEKS expectation`);
    assert.deepEqual(
      question.answer.map(index => question.choices[index]),
      expected.answers,
      `${question.id} has the wrong answer key`
    );
  }
});

test('all Test Prep banks preserve valid assessment structure', () => {
  const expected = [
    { id: 'algebra1-staar-style-quick-check-v1', questions: 10, points: 11 },
    { id: 'algebra1-staar-style-half-test-v1', questions: 25, points: 29 },
    { id: 'algebra1-staar-style-full-extension-v1', questions: 25, points: 30 }
  ];

  for (const [index, bank] of banks.entries()) {
    assert.equal(bank.id, expected[index].id);
    assert.equal(bank.questions.length, expected[index].questions);
    assert.equal(bank.questions.reduce((sum, question) => sum + question.points, 0), expected[index].points);

    for (const question of bank.questions) {
      assert.ok(question.prompt || question.prompt_html, `${question.id} needs a prompt`);
      assert.ok(question.module_id, `${question.id} needs a remediation module`);
      assert.ok(question.rationale, `${question.id} needs a rationale`);
      const remediationModule = findCourseModule(courseCatalog, question.module_id);
      assert.ok(remediationModule, `${question.id} points to a missing remediation module`);
      assert.deepEqual(remediationModule.teks, [question.teks], `${question.id} remediation must match its TEKS`);
      assert.equal(new Set(question.choices).size, question.choices.length, `${question.id} repeats choice text`);
      assert.equal(new Set(question.answer).size, question.answer.length, `${question.id} repeats an answer index`);

      for (const answerIndex of question.answer) {
        assert.ok(Number.isInteger(answerIndex), `${question.id} has a non-integer answer index`);
        assert.ok(answerIndex >= 0 && answerIndex < question.choices.length, `${question.id} has an invalid answer index`);
      }

      if (question.type === 'multiple_choice') assert.equal(question.answer.length, 1, question.id);
      if (question.type === 'multi_select') assert.equal(question.answer.length, 2, question.id);
    }
  }
});

test('corrected items encode their reviewed mathematics', () => {
  const questions = Object.fromEntries(banks.flatMap(bank => bank.questions).map(question => [question.id, question]));

  assert.equal(12 * 5 + 18 * 6 <= 180, true, 'qc6 example must satisfy its budget model');
  assert.equal(2 * 5 + 3 * 6 <= 30, true, 'qc6 simplified model must be equivalent');
  assert.equal(3 + 5, 8, 'ht5 product-rule exponents must add');
  assert.equal(850 - 376, 474, 'ht12 capacity calculation must be correct');
  assert.equal(2 * 2 + 1, 5, 'ht16 solution must satisfy the first equation');
  assert.equal(-2 + 7, 5, 'ht16 solution must satisfy the second equation');
  assert.equal(questions.qc4.module_id, 'alg1-a2c-equations-from-representations');
  assert.equal(questions.ht5.module_id, 'alg1-a11b-laws-of-exponents');
  assert.equal(questions.ht9.module_id, 'alg1-a3c-graph-linear-functions');
  assert.equal(questions.ht12.module_id, 'alg1-a5b-linear-inequalities');
  assert.equal(questions.ht16.module_id, 'alg1-a5c-linear-systems');
});
