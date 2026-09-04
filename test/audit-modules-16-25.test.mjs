import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lessonHtml = read('public/lesson.html');
const practiceHtml = read('public/practice.html');
const batch6Visual = read('public/batch6-visual.js');
const batch7Visual = read('public/batch7-visual.js');
const batch6Help = read('public/batch6-help.js');
const batch7Help = read('public/batch7-help.js');
const practiceFlow = read('public/audit3-practice-review-flow.js');
const normalizerSource = read('public/audit3-linear-answer-normalizer.js');

test('Modules 16–25 audit scripts are wired before grading', () => {
  assert.match(lessonHtml, /audit3-linear-answer-normalizer\.js/);
  assert.match(practiceHtml, /audit3-linear-answer-normalizer\.js/);
  assert.match(practiceHtml, /audit3-practice-review-flow\.js/);
  assert.ok(lessonHtml.indexOf('/audit3-linear-answer-normalizer.js') < lessonHtml.indexOf('/lesson.js'));
});

test('Module 16 and Module 19 include actual coordinate-plane visuals', () => {
  assert.match(batch6Visual, /Actual graph/i);
  assert.match(batch6Visual, /slope triangle/i);
  assert.match(batch6Visual, /perpendicular lines crossing at a right angle/i);
  assert.match(batch6Visual, /<svg/);
});

test('Modules 21–25 retain graph-rich visual instruction', () => {
  assert.match(batch7Visual, /boundary style and shading/i);
  assert.match(batch7Visual, /two equations, one shared solution/i);
  assert.match(batch7Visual, /slope = rise\/run/i);
  assert.match(batch7Visual, /rate of change has units/i);
  assert.match(batch7Visual, /x-intercept \/ zero/i);
});

test('lesson help preserves mastery integrity and uses safe observer writes', () => {
  for (const source of [batch6Help, batch7Help]) {
    assert.match(source, /isMastery/);
    assert.match(source, /Review Solution & Continue/);
    assert.match(source, /observer\?\.disconnect/);
    assert.match(source, /Hint 3: answer and complete reasoning/);
  }
});

test('practice wrong-answer flow explicitly continues after solution review', () => {
  assert.match(practiceFlow, /A\.2C/);
  assert.match(practiceFlow, /A\.3C/);
  assert.match(practiceFlow, /Review Solution & Continue/);
});

test('linear normalizer accepts harmless term order without rewriting standard form', () => {
  const document = { addEventListener() {}, querySelector() { return null; } };
  const location = { search: '?skill=A.2C' };
  const window = {};
  vm.runInNewContext(normalizerSource, { window, document, location, URLSearchParams, Event: class Event {} });
  const canonical = window.__toluxCanonicalLinearAnswer;
  assert.equal(typeof canonical, 'function');
  assert.equal(canonical('y=6-2x'), 'y=-2x+6');
  assert.equal(canonical('C=4+2.5m'), 'C=2.5m+4');
  assert.equal(canonical('y≥7-2x'), 'y≥-2x+7');
  assert.equal(canonical('y=1+2x;y=4-x'), 'y=2x+1;y=-x+4');
  assert.equal(canonical('2x+y=7'), '2x+y=7');
});
