import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modules=[
  ['A.2C','a2c-lines-from-representations.json'],
  ['A.2D','a2d-direct-variation.json'],
  ['A.2E','a2e-parallel-lines.json'],
  ['A.2F','a2f-perpendicular-lines.json'],
  ['A.2G','a2g-horizontal-vertical-lines.json']
];

for(const [teks,file] of modules){
  test(`${teks} follows Tolux lesson quality standard`,()=>{
    const data=JSON.parse(fs.readFileSync(new URL(`../public/${file}`,import.meta.url),'utf8'));
    assert.deepEqual(data.teks,[teks]);
    assert.ok(data.concept_cards.length>=4);
    assert.equal(data.lesson_flow.length,7);
    assert.equal(data.lesson_settings.mastery_item_ids.length,5);
    assert.ok(data.lesson_settings.guided_item_ids.length>=3);
    assert.ok(data.lesson_settings.independent_item_ids.length>=3);
    assert.ok(data.misconception_routes);
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

test('A.2C through A.2G load visuals, full help, dashboard exposure, and 5/10/20 practice',()=>{
  const lesson=fs.readFileSync(new URL('../public/lesson.html',import.meta.url),'utf8');
  const practice=fs.readFileSync(new URL('../public/practice.html',import.meta.url),'utf8');
  const visuals=fs.readFileSync(new URL('../public/batch6-visual.js',import.meta.url),'utf8');
  const help=fs.readFileSync(new URL('../public/batch6-help.js',import.meta.url),'utf8');
  const bridge=fs.readFileSync(new URL('../public/batch6-dashboard-bridge.js',import.meta.url),'utf8');
  const previousBridge=fs.readFileSync(new URL('../public/batch5-dashboard-bridge.js',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../public/batch6-practice.js',import.meta.url),'utf8');
  assert.match(lesson,/batch6-visual\.js/);
  assert.match(lesson,/batch6-help\.js/);
  assert.match(visuals,/representation.*slope.*intercept/i);
  assert.match(visuals,/direct variation/i);
  assert.match(visuals,/parallel lines keep the same slope/i);
  assert.match(visuals,/flip \+ change sign/i);
  assert.match(visuals,/horizontal vs vertical/i);
  assert.match(help,/Final answer:/);
  assert.match(help,/hint\s*3/i);
  assert.match(help,/not quite/i);
  assert.match(previousBridge,/batch6-dashboard-bridge\.js/);
  for(const teks of ['A.2C','A.2D','A.2E','A.2F','A.2G']){
    assert.match(bridge,new RegExp(teks.replace('.','\\.')));
    assert.match(runtime,new RegExp(teks.replace('.','\\.')));
  }
  assert.match(practice,/batch6-practice\.js/);
  assert.match(runtime,/\[5,10,20\]/);
  assert.match(runtime,/lesson-progress/);
  assert.match(runtime,/Correct answer and full explanation/);
});