import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../public/${path}`, import.meta.url), 'utf8');
const load = path => JSON.parse(read(path));
const modules = [
  ['a4a-correlation-coefficient.json','A.4A'],
  ['a4b-association-causation.json','A.4B'],
  ['a4c-linear-regression.json','A.4C'],
  ['a5a-linear-equations.json','A.5A'],
  ['a5b-linear-inequalities.json','A.5B']
];

test('Modules 31 through 35 expose complete Tolux lesson stages', () => {
  for (const [file,teks] of modules) {
    const module=load(file);
    assert.equal(module.teks[0],teks);
    assert.ok(module.concept_cards.length>=4);
    assert.equal(module.lesson_flow.length,7);
    assert.ok(module.lesson_settings.mastery_item_ids.length>=5);
    const ids=new Set(module.items.map(item=>item.id));
    for(const id of module.lesson_settings.mastery_item_ids) assert.ok(ids.has(id));
  }
});

test('A.4A teaches correlation with technology, direction, magnitude, and non-causal interpretation', () => {
  const text=read('a4a-correlation-coefficient.json');
  assert.match(text,/technology-generated correlation coefficient/i);
  assert.match(text,/\|r\|/);
  assert.match(text,/correlation ≠ causation/i);
});

test('A.4B explicitly separates association, lurking variables, and causal study design', () => {
  const text=read('a4b-association-causation.json');
  assert.match(text,/lurking variable/i);
  assert.match(text,/randomized controlled experiment/i);
  assert.match(text,/association/i);
});

test('A.4C teaches line of fit, contextual slope, prediction, interpolation, and extrapolation', () => {
  const text=read('a4c-linear-regression.json');
  for(const phrase of ['line of fit','interpolation','extrapolation','slope']) assert.match(text,new RegExp(phrase,'i'));
});

test('Batch 9 visual layer contains actual SVG scatterplots and visual algebra models', () => {
  const visual=read('batch9-visual.js');
  assert.match(visual,/<svg/);
  assert.match(visual,/Strong positive scatterplot/);
  assert.match(visual,/line of fit/i);
  assert.match(visual,/Equation balance/i);
  assert.match(visual,/Number-line examples/i);
});

test('Batch 9 help reveals answers and allows students to continue after review', () => {
  const help=read('batch9-help.js');
  assert.match(help,/Final answer:/);
  assert.match(help,/Review Solution & Continue/);
  assert.match(help,/hint\s*3/i);
  assert.match(help,/another way/i);
});

test('A.4A through A.4C have dedicated 5, 10, or 20-question Practice Mode with progress saving', () => {
  const practice=read('batch9-practice.js');
  assert.match(practice,/\[5,10,20\]/);
  assert.match(practice,/lesson-progress/);
  assert.match(practice,/Hint 3: answer and complete reasoning/);
  const html=read('practice.html');
  assert.match(html,/\["A\.4A","A\.4B","A\.4C"\]/);
  assert.match(html,/batch9-practice\.js/);
});

test('Dashboard bridge exposes Modules 31 through 35 and chains from Batch 8', () => {
  const bridge=read('batch9-dashboard-bridge.js');
  for(const code of ['A.4A','A.4B','A.4C','A.5A','A.5B']) assert.match(bridge,new RegExp(code.replace('.','\\.')));
  assert.match(read('batch8-dashboard-bridge.js'),/batch9-dashboard-bridge\.js/);
});

test('Lesson page loads Batch 9 visuals and comprehensive help', () => {
  const html=read('lesson.html');
  assert.match(html,/batch9-visual\.js/);
  assert.match(html,/batch9-help\.js/);
});
