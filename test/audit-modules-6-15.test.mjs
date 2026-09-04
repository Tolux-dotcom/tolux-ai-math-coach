import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lessonHtml = read('public/lesson.html');
const practiceHtml = read('public/practice.html');
const normalizerSource = read('public/audit1-polynomial-answer-normalizer.js');
const a10dVisual = read('public/audit2-a10d-visual.js');
const a10defHelp = read('public/audit2-a10d-e-f-help.js');
const auditedPractice = read('public/audit2-polynomial-practice.js');
const a10fPracticeUpgrade = read('public/audit2-a10f-practice-upgrade.js');
const a10eVisual = read('public/a10e-x-method.js');
const a10fVisual = read('public/a10f-visual.js');
const a12aVisual = read('public/a12a-visual.js');
const a12aHelp = read('public/a12a-help.js');
const a12bHelp = read('public/a12b-help.js');
const batch5Visual = read('public/batch5-visual.js');
const batch5Help = read('public/batch5-help.js');
const batch5Practice = read('public/batch5-practice.js');

test('Modules 6 through 8 audit scripts are wired into lesson and practice pages', () => {
  assert.match(lessonHtml, /audit2-a10d-visual\.js/);
  assert.match(lessonHtml, /audit2-a10d-e-f-help\.js/);
  assert.match(practiceHtml, /\["A\.10D","A\.10E"\]/);
  assert.match(practiceHtml, /audit2-polynomial-practice\.js/);
  assert.match(practiceHtml, /audit2-a10f-practice-upgrade\.js/);
});

test('Module 6 has visual forward and reverse equivalence teaching', () => {
  assert.match(a10dVisual, /FACTORED FORM/);
  assert.match(a10dVisual, /EXPANDED FORM/);
  assert.match(a10dVisual, /distribute/i);
  assert.match(a10dVisual, /factor GCF/i);
  assert.match(a10dVisual, /x² terms/);
});

test('Modules 6 through 8 use the current non-mastery help and continue standard', () => {
  assert.match(a10defHelp, /Hint\\s\*3|Hint\\s\*3/i);
  assert.match(a10defHelp, /Review Solution & Continue/);
  assert.match(a10defHelp, /observer\?\.disconnect|observer\.disconnect/);
  assert.match(a10defHelp, /isMastery/);
  assert.match(a10fPracticeUpgrade, /Review Solution & Continue/);
  assert.match(a10fPracticeUpgrade, /observer\?\.disconnect|observer\.disconnect/);
});

test('Modules 6 and 7 audited Practice Mode supports 5 10 20, hints, full solutions, and progress', () => {
  assert.match(auditedPractice, /\[5,10,20\]/);
  assert.match(auditedPractice, /Hint 3: answer and complete reasoning/);
  assert.match(auditedPractice, /Correct answer and full explanation/);
  assert.match(auditedPractice, /first_attempt_correct/);
  assert.match(auditedPractice, /\/api\/lesson-progress/);
  assert.match(auditedPractice, /A\.10D/);
  assert.match(auditedPractice, /A\.10E/);
});

test('Module 6 expanded polynomial answers accept harmless term-order differences', () => {
  const document = { addEventListener() {}, querySelector() { return null; } };
  const window = { location: { search: '?skill=A.10D' } };
  vm.runInNewContext(normalizerSource, { window, document, URLSearchParams, Event: class Event {} });
  const canonical = window.__toluxCanonicalPolynomial;
  assert.equal(typeof canonical, 'function');
  assert.equal(canonical('5 + 7x² + 2x'), '7x²+2x+5');
  assert.equal(canonical('2x + x² + 3x - 1'), 'x²+5x-1');
  assert.equal(canonical('3x(2x+3)'), '3x(2x+3)');
});

test('Modules 7 and 8 preserve their established visual teaching', () => {
  assert.match(a10eVisual, /Visual X \/ AC method|PAPER METHOD/);
  assert.match(a10eVisual, /Divide BOTH side numbers by a/);
  assert.match(a10fVisual, /difference of squares/i);
});

test('Modules 9 and 10 retain visual/function support and safe review-and-continue help', () => {
  assert.match(a12aVisual, /vertical line|mapping/i);
  for (const source of [a12aHelp, a12bHelp]) {
    assert.match(source, /Review Solution & Continue/);
    assert.match(source, /observer\?\.disconnect|observer\.disconnect/);
    assert.match(source, /isMastery/);
  }
  assert.match(practiceHtml, /a12a-practice\.js/);
  assert.match(practiceHtml, /a12b-practice\.js/);
});

test('Modules 11 through 15 retain visual teaching including actual graphs where needed', () => {
  assert.match(batch5Visual, /difference or ratio/i);
  assert.match(batch5Visual, /aₙ = a₁/);
  assert.match(batch5Visual, /isolate the target variable/i);
  const svgCount = (batch5Visual.match(/<svg/g) || []).length;
  assert.ok(svgCount >= 2);
  assert.match(batch5Visual, /DOMAIN: x-values/);
  assert.match(batch5Visual, /RANGE: y-values/);
  assert.match(batch5Visual, /rise/);
  assert.match(batch5Visual, /run/);
});

test('Modules 11 through 15 use current help, Practice Mode, and safe observer behavior', () => {
  assert.match(batch5Help, /Review Solution & Continue/);
  assert.match(batch5Help, /observer\?\.disconnect|observer\.disconnect/);
  assert.match(batch5Help, /isMastery/);
  assert.match(batch5Practice, /\[5,10,20\]/);
  assert.match(batch5Practice, /Hint 3/);
  assert.match(batch5Practice, /\/api\/lesson-progress/);
  for (const skill of ['A.12C','A.12D','A.12E','A.2A','A.2B']) assert.match(batch5Practice, new RegExp(skill.replace('.', '\\.')));
});
