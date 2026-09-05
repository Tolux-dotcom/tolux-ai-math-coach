import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const lessonHtml=read('public/lesson.html');
const practiceHtml=read('public/practice.html');
const visual=read('public/audit5-exponential-visual.js');
const help=read('public/audit5-lesson-help.js');
const practice=read('public/audit5-exponential-practice.js');
const a3fGraphs=read('public/a3f-problem-graphs.js');

test('final A.9B–A.9E audit is wired into lesson and practice',()=>{
  assert.match(lessonHtml,/audit5-exponential-visual\.js/);
  assert.match(lessonHtml,/audit5-lesson-help\.js/);
  assert.match(practiceHtml,/\["A\.9B","A\.9C","A\.9D","A\.9E"\]\.includes\(skill\).*audit5-exponential-practice\.js/);
});

test('exponential visuals use mathematically defined growth decay and asymptotes',()=>{
  assert.match(visual,/Math\.pow\(1\.5,x\)/);
  assert.match(visual,/Math\.pow\(\.5,x\)/);
  assert.match(visual,/Math\.pow\(1\.1,x\)/);
  assert.match(visual,/Math\.pow\(\.9,x\)/);
  assert.match(visual,/Math\.pow\(2,x\)\+25/);
  assert.match(visual,/asymptote y=/i);
  assert.match(visual,/Illustrative learning data/);
  assert.match(visual,/Residuals observed − predicted/);
});

test('final exponential help preserves mastery and upgrades non-mastery feedback',()=>{
  assert.match(help,/Mastery Check/);
  assert.match(help,/Review Solution & Continue/);
  assert.match(help,/Hint 3: answer revealed/);
  assert.match(help,/Another complete approach/);
  assert.match(help,/observer\?\.disconnect/);
});

test('A.9B–A.9E practice follows Tolux 5 10 20 learning standard',()=>{
  for(const skill of ['A.9B','A.9C','A.9D','A.9E'])assert.match(practice,new RegExp(skill.replace('.','\\.')));
  assert.match(practice,/validatePracticeOptions/);
  assert.match(practice,/generateStructuredPracticeSession/);
  assert.match(practice,/Review Solution & Continue/);
  assert.match(practice,/Hint 3: answer and complete reasoning/);
  assert.match(practice,/first_attempt_correct/);
  assert.match(practice,/lesson-progress/);
  assert.match(practice,/trial-heartbeat/);
});

test('A.3F displays real coordinate-plane graphs with each problem',()=>{
  assert.match(lessonHtml,/a3f-problem-graphs\.js/);
  assert.match(practiceHtml,/a3f-problem-graphs\.js/);
  assert.match(a3fGraphs,/Solve from the actual graph/);
  assert.match(a3fGraphs,/numbered axes use a consistent scale/i);
  assert.match(a3fGraphs,/parseLinear/);
  assert.match(a3fGraphs,/2?y=/);
  assert.match(a3fGraphs,/nonparallel/);
  assert.match(a3fGraphs,/same line/);
  assert.match(a3fGraphs,/parallel/);
  assert.match(a3fGraphs,/intersection/i);
  assert.match(a3fGraphs,/MutationObserver/);
  assert.match(a3fGraphs,/observer\?\.disconnect/);
});
