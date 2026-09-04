import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const lessonHtml=read('public/lesson.html');
const practiceHtml=read('public/practice.html');
const batch8Help=read('public/batch8-help.js');
const batch9Help=read('public/batch9-help.js');
const graphUpgrade=read('public/audit3-batch8-graph-upgrade.js');
const a5Practice=read('public/audit3-a5-practice.js');
const reviewLabel=read('public/audit3-practice-review-label.js');

test('Modules 26–35 protect mastery while revealing non-mastery solutions',()=>{
  for(const source of [batch8Help,batch9Help]){
    assert.match(source,/Mastery Check/);
    assert.match(source,/Review Solution & Continue/);
    assert.match(source,/observer\?\.disconnect|observer\.disconnect/);
    assert.match(source,/Final answer/);
  }
});

test('A.3F and A.3G receive explicit coordinate-plane detail',()=>{
  assert.match(graphUpgrade,/Coordinate-plane check/);
  assert.match(graphUpgrade,/one solution/i);
  assert.match(graphUpgrade,/No solution/i);
  assert.match(graphUpgrade,/Infinitely many/i);
  assert.match(graphUpgrade,/intersection ≈ \(3\.5, 18\)/);
  assert.match(graphUpgrade,/1 unit per x interval/);
  assert.match(graphUpgrade,/5 units per y interval/);
  assert.match(lessonHtml,/audit3-batch8-graph-upgrade\.js/);
});

test('A.5A and A.5B use audited 5 10 20 practice with immediate review flow',()=>{
  assert.match(practiceHtml,/\["A\.5A","A\.5B"\]\.includes\(skill\).*audit3-a5-practice\.js/);
  assert.match(a5Practice,/generatePracticeSession/);
  assert.match(a5Practice,/Review Solution & Continue/);
  assert.match(a5Practice,/Hint 3: answer and complete reasoning/);
  assert.match(a5Practice,/first_attempt_correct/);
  assert.match(a5Practice,/lesson-progress/);
  assert.match(a5Practice,/trial-heartbeat/);
});

test('Batch 8 and Batch 9 practice expose explicit review continuation',()=>{
  assert.match(reviewLabel,/A\.3D/);
  assert.match(reviewLabel,/A\.4C/);
  assert.match(reviewLabel,/Review Solution & Continue/);
  assert.match(practiceHtml,/audit3-practice-review-label\.js/);
});
