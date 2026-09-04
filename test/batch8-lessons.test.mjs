import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modules=[
  ['A.3D','a3d-graph-linear-inequalities.json'],
  ['A.3E','a3e-linear-transformations.json'],
  ['A.3F','a3f-graph-linear-systems.json'],
  ['A.3G','a3g-estimate-system-solutions.json'],
  ['A.3H','a3h-graph-systems-of-inequalities.json']
];

for(const [teks,file] of modules){
  test(`${teks} meets the Tolux lesson-quality structure`,()=>{
    const data=JSON.parse(fs.readFileSync(new URL(`../public/${file}`,import.meta.url),'utf8'));
    assert.deepEqual(data.teks,[teks]);
    assert.ok(data.concept_cards.length>=4);
    assert.equal(data.lesson_flow.length,7);
    assert.equal(data.lesson_settings.mastery_item_ids.length,5);
    assert.ok(data.lesson_settings.guided_item_ids.length>=3);
    assert.ok(data.lesson_settings.independent_item_ids.length>=3);
    const byId=new Map(data.items.map(item=>[item.id,item]));
    for(const id of [...data.lesson_settings.guided_item_ids,...data.lesson_settings.independent_item_ids,...data.lesson_settings.mastery_item_ids]){
      const item=byId.get(id);
      assert.ok(item,`missing ${id}`);
      assert.ok(item.answer_key);
      assert.ok(item.solution_steps?.length);
      assert.ok(item.hint_steps?.length>=3);
      assert.ok(item.tutor_behavior);
    }
  });
}

test('Modules 26-30 load actual graph visuals and comprehensive help',()=>{
  const lesson=fs.readFileSync(new URL('../public/lesson.html',import.meta.url),'utf8');
  const visuals=fs.readFileSync(new URL('../public/batch8-visual.js',import.meta.url),'utf8');
  const help=fs.readFileSync(new URL('../public/batch8-help.js',import.meta.url),'utf8');
  assert.match(lesson,/batch8-visual\.js/);
  assert.match(lesson,/batch8-help\.js/);
  assert.match(visuals,/<svg/);
  assert.match(visuals,/shaded solution side/i);
  assert.match(visuals,/steeper/i);
  assert.match(visuals,/one solution/i);
  assert.match(visuals,/estimate/i);
  assert.match(visuals,/OVERLAP = solutions to both/);
  assert.match(help,/Hint 3|hint\s*3/i);
  assert.match(help,/Final answer:/);
  assert.match(help,/incorrect|not correct/i);
});

test('Modules 26-30 are exposed in dashboard, course runtime, and Practice Mode',()=>{
  const bridge=fs.readFileSync(new URL('../public/batch8-dashboard-bridge.js',import.meta.url),'utf8');
  const previous=fs.readFileSync(new URL('../public/batch7-dashboard-bridge.js',import.meta.url),'utf8');
  const course=fs.readFileSync(new URL('../public/course-core.mjs',import.meta.url),'utf8');
  const practice=fs.readFileSync(new URL('../public/practice.html',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../public/batch8-practice.js',import.meta.url),'utf8');
  for(const teks of ['A.3D','A.3E','A.3F','A.3G','A.3H']){
    assert.match(bridge,new RegExp(teks.replace('.','\\.')));
    assert.match(runtime,new RegExp(teks.replace('.','\\.')));
  }
  for(const id of ['alg1-a3d-graph-linear-inequalities','alg1-a3e-linear-transformations','alg1-a3f-graph-linear-systems','alg1-a3g-estimate-system-solutions','alg1-a3h-graph-systems-of-inequalities']){
    assert.match(course,new RegExp(id));
  }
  assert.match(previous,/batch8-dashboard-bridge\.js/);
  assert.match(practice,/batch8-practice\.js/);
  assert.match(runtime,/\[5,10,20\]/);
  assert.match(runtime,/lesson-progress/);
  assert.match(runtime,/Correct answer and full explanation/);
});
