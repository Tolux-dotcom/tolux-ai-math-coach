import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modules=[
  ['A.2H','a2h-write-linear-inequalities.json'],
  ['A.2I','a2i-write-linear-systems.json'],
  ['A.3A','a3a-determine-slope.json'],
  ['A.3B','a3b-rate-of-change.json'],
  ['A.3C','a3c-graph-linear-functions.json']
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
      assert.doesNotMatch(String(item.prompt),/\^[0-9(]/,`${id} prompt should use classroom notation`);
      assert.doesNotMatch(String(item.answer_key),/\^[0-9(]/,`${id} answer should use classroom notation`);
    }
  });
}

test('graph-focused batch includes actual visual graphs and teaching cues',()=>{
  const visuals=fs.readFileSync(new URL('../public/batch7-visual.js',import.meta.url),'utf8');
  for(const token of ['<svg','stroke-dasharray','intersection','rise','run','Δ time','x-intercept / zero','SHADED: solutions']) assert.match(visuals,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(visuals,/solid/i);
  assert.match(visuals,/dashed/i);
  assert.match(visuals,/slope = rise\/run/i);
});

test('Modules 21 through 25 load comprehensive help, dashboard exposure, and 5/10/20 practice',()=>{
  const lesson=fs.readFileSync(new URL('../public/lesson.html',import.meta.url),'utf8');
  const practice=fs.readFileSync(new URL('../public/practice.html',import.meta.url),'utf8');
  const help=fs.readFileSync(new URL('../public/batch7-help.js',import.meta.url),'utf8');
  const bridge=fs.readFileSync(new URL('../public/batch7-dashboard-bridge.js',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../public/batch7-practice.js',import.meta.url),'utf8');
  assert.match(lesson,/batch7-visual\.js/);
  assert.match(lesson,/batch7-help\.js/);
  assert.match(help,/Final answer:/);
  assert.match(help,/hint\s*3/i);
  assert.match(help,/not quite/i);
  for(const teks of ['A.2H','A.2I','A.3A','A.3B','A.3C']){
    assert.match(bridge,new RegExp(teks.replace('.','\\.')));
    assert.match(runtime,new RegExp(teks.replace('.','\\.')));
  }
  assert.match(practice,/batch7-practice\.js/);
  assert.match(runtime,/\[5,10,20\]/);
  assert.match(runtime,/lesson-progress/);
  assert.match(runtime,/Correct answer and full explanation/);
});
