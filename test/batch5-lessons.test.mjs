import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modules=[
  ['A.12C','a12c-sequence-terms.json'],
  ['A.12D','a12d-sequence-formulas.json'],
  ['A.12E','a12e-literal-equations.json'],
  ['A.2A','a2a-linear-domain-range.json'],
  ['A.2B','a2b-equations-from-points.json']
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
      const item=byId.get(id); assert.ok(item,`missing ${id}`); assert.ok(item.answer_key); assert.ok(item.solution_steps?.length); assert.ok(item.hint_steps?.length>=3); assert.ok(item.tutor_behavior);
      assert.doesNotMatch(String(item.prompt),/\^[0-9(]/,`${id} prompt should use classroom notation`);
      assert.doesNotMatch(String(item.answer_key),/\^[0-9(]/,`${id} answer should use classroom notation`);
    }
  });
}

test('five-module batch loads visuals, comprehensive help, dashboard exposure, and dedicated practice',()=>{
  const lesson=fs.readFileSync(new URL('../public/lesson.html',import.meta.url),'utf8');
  const practice=fs.readFileSync(new URL('../public/practice.html',import.meta.url),'utf8');
  const visuals=fs.readFileSync(new URL('../public/batch5-visual.js',import.meta.url),'utf8');
  const help=fs.readFileSync(new URL('../public/batch5-help.js',import.meta.url),'utf8');
  const bridge=fs.readFileSync(new URL('../public/batch5-dashboard-bridge.js',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../public/batch5-practice.js',import.meta.url),'utf8');
  assert.match(lesson,/batch5-visual\.js/); assert.match(lesson,/batch5-help\.js/);
  assert.match(visuals,/DOMAIN: x-values/); assert.match(visuals,/rise/); assert.match(visuals,/aₙ = a₁/);
  assert.match(help,/Final answer:/); assert.match(help,/hint\s*3/i); assert.match(help,/not quite/i);
  for(const teks of ['A.12C','A.12D','A.12E','A.2A','A.2B']){assert.match(bridge,new RegExp(teks.replace('.','\\.')));assert.match(runtime,new RegExp(teks.replace('.','\\.')));}
  assert.match(practice,/batch5-practice\.js/); assert.match(runtime,/\[5,10,20\]/); assert.match(runtime,/lesson-progress/); assert.match(runtime,/Correct answer and full explanation/);
});

test('sequence formula students can enter true subscript notation from the math toolbar',()=>{
  const toolbar=fs.readFileSync(new URL('../public/math-symbol-toolbar.js',import.meta.url),'utf8');
  const sequence=JSON.parse(fs.readFileSync(new URL('../public/a12d-sequence-formulas.json',import.meta.url),'utf8'));
  assert.match(toolbar,/label: "aₙ"/);
  assert.match(toolbar,/label: "a₁"/);
  const formulaItems=sequence.items.filter(item=>String(item.answer_key).includes('aₙ'));
  assert.ok(formulaItems.length>0);
  assert.ok(formulaItems.every(item=>item.accepted_answers.some(answer=>String(answer).includes('aₙ'))));
  assert.ok(formulaItems.every(item=>item.accepted_answers.some(answer=>String(answer).includes('a_n')||String(answer).startsWith('an='))));
});