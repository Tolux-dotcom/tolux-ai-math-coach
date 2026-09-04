import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lessonHtml = read('public/lesson.html');
const practiceHtml = read('public/practice.html');
const visual = read('public/audit1-polynomial-visual.js');
const help = read('public/audit1-polynomial-help.js');
const a11Lesson = read('public/audit1-a11-lesson-upgrade.js');
const a11Practice = read('public/audit1-a11-practice-upgrade.js');
const practice = read('public/audit1-polynomial-practice.js');
const normalizerSource = read('public/audit1-polynomial-answer-normalizer.js');

test('Module 1 visual is actually wired and A.11 attempt-flow upgrades are loaded', () => {
  assert.match(lessonHtml, /\/a11a-visual\.js/);
  assert.match(lessonHtml, /\/audit1-a11-lesson-upgrade\.js/);
  assert.match(practiceHtml, /\/audit1-a11-practice-upgrade\.js/);
});

test('Modules 3 through 5 use visual-first teaching and dedicated Practice Mode', () => {
  assert.match(visual, /line up like terms by degree/i);
  assert.match(visual, /2 × 2 box/i);
  assert.match(visual, /divide → multiply → subtract → bring down/i);
  assert.match(practiceHtml, /\["A\.10A","A\.10B","A\.10C"\]/);
  assert.match(practiceHtml, /audit1-polynomial-practice\.js/);
});

test('retrofit help reveals Hint 3, full solution, and a continue control', () => {
  for (const source of [help, a11Lesson, a11Practice, practice]) {
    assert.match(source, /Hint 3/i);
    assert.match(source, /Final answer|Correct answer/i);
  }
  assert.match(help, /Review Solution & Continue/);
  assert.match(a11Lesson, /Review Solution & Continue/);
  assert.match(a11Practice, /Review Solution & Continue/);
  assert.match(help, /observer\?\.disconnect|observer\.disconnect/);
});

test('polynomial answer normalizer accepts equivalent term order and notation', () => {
  const document = { addEventListener() {}, querySelector() { return null; } };
  const window = { location: { search: '?skill=A.10A' } };
  vm.runInNewContext(normalizerSource, { window, document, URLSearchParams, Event: class Event {} });
  const canonical = window.__toluxCanonicalPolynomial;
  assert.equal(typeof canonical, 'function');
  assert.equal(canonical('5 + 2x + 7x²'), '7x^2+2x+5');
  assert.equal(canonical('3x + x^2 - 1 + 2x'), 'x^2+5x-1');
  assert.equal(canonical('2x² + x - 3, remainder -2'), '2x^2+x-3 remainder -2');
  assert.equal(canonical('0x²'), '0x²');
});

test('polynomial scripts are scoped and loaded before grading', () => {
  assert.ok(lessonHtml.indexOf('/audit1-polynomial-answer-normalizer.js') < lessonHtml.indexOf('/lesson.js'));
  assert.ok(practiceHtml.indexOf('/audit1-polynomial-answer-normalizer.js') < practiceHtml.indexOf('type="module"'));
  assert.match(help, /alg1-a10a-add-subtract-polynomials/);
  assert.match(help, /alg1-a10b-multiply-polynomials/);
  assert.match(help, /alg1-a10c-divide-polynomials/);
});