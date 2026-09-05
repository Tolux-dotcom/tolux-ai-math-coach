import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const lessonHtml=read('public/lesson.html');
const practiceHtml=read('public/practice.html');
const visual=read('public/audit4-visual.js');
const help=read('public/audit4-lesson-help.js');
const a5c=read('public/audit4-a5c-practice.js');
const structured=read('public/audit4-structured-practice.js');

test('Modules 36–45 are explicitly mapped into the audit',()=>{
  for(const token of ['alg1-a5c-linear-systems','alg1-a6a-quadratic-domain-range','alg1-a6b-write-quadratics-from-vertex','alg1-a6c-write-quadratics-from-solutions','alg1-a7a-quadratic-key-features','alg1-a7b-factors-and-zeros','alg1-a7c-quadratic-transformations','alg1-a8a-solve-quadratic-equations','alg1-a8b-quadratic-regression','alg1-a9a-exponential-domain-range']) assert.match(help,new RegExp(token));
});

test('Quadratic and system visuals are generated from exact stated functions',()=>{
  assert.match(visual,/y=x\+1/);
  assert.match(visual,/y=7−x/);
  assert.match(visual,/\(3,4\)/);
  assert.match(visual,/\(x-1\)\*\*2-2/);
  assert.match(visual,/\(x-1\)\*\(x-3\)/);
  assert.match(visual,/\(x-1\)\*\*2-4/);
  assert.match(visual,/\(x\+1\)\*\(x-2\)/);
  assert.match(visual,/x\*x/);
  assert.match(visual,/2\*x\*x/);
  assert.match(visual,/-x\*x/);
  assert.match(visual,/\(x-2\)\*\*2\+1/);
  assert.match(visual,/x\*x-5\*x\+6/);
  assert.match(visual,/quadratic formula/i);
  assert.match(visual,/b²−4ac/);
  assert.match(visual,/illustrative quadratic fit/);
  assert.match(visual,/attempts>=120/);
});

test('A.9A preserves its previously approved graph implementation',()=>{
  assert.match(lessonHtml,/a9a-visual-concept\.js/);
  assert.doesNotMatch(visual,/alg1-a9a-exponential-domain-range/);
});

test('Lesson help protects mastery and provides full review flow',()=>{
  assert.match(help,/Mastery Check/);
  assert.match(help,/Review Solution & Continue/);
  assert.match(help,/Hint 3: answer and complete reasoning/);
  assert.match(help,/Another complete approach/);
  assert.match(help,/observer\?\.disconnect/);
  assert.match(help,/Final answer/);
  assert.match(lessonHtml,/audit4-visual\.js/);
  assert.match(lessonHtml,/audit4-lesson-help\.js/);
});

test('A.5C audited practice keeps 5 10 20 support and current attempt behavior',()=>{
  assert.match(practiceHtml,/skill===\"A\.5C\".*audit4-a5c-practice\.js/);
  assert.match(a5c,/generatePracticeSession/);
  assert.match(a5c,/Review Solution & Continue/);
  assert.match(a5c,/Hint 3: answer and complete reasoning/);
  assert.match(a5c,/first_attempt_correct/);
  assert.match(a5c,/lesson-progress/);
  assert.match(a5c,/trial-heartbeat/);
});

test('A.6A through A.9A route through audited structured Practice Mode',()=>{
  for(const skill of ['A.6A','A.6B','A.6C','A.7A','A.7B','A.7C','A.8A','A.8B','A.9A']) assert.match(structured,new RegExp(skill.replace('.','\\.')));
  assert.match(practiceHtml,/audit4-structured-practice\.js/);
  assert.match(structured,/generateStructuredPracticeSession/);
  assert.match(structured,/Review Solution & Continue/);
  assert.match(structured,/Hint 3: answer and complete reasoning/);
  assert.match(structured,/first_attempt_correct/);
  assert.match(structured,/lesson-progress/);
  assert.match(structured,/trial-heartbeat/);
});