import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const d=JSON.parse(readFileSync(new URL('../public/physics-5b-scalars-vectors.json',import.meta.url),'utf8'));
const h=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');
const c=vm.createContext({});vm.runInContext(h.slice(h.indexOf('function normalizeAnswer('),h.indexOf('function updatePath(')),c);
test('5B resultant magnitudes match their drawn components and require meters',()=>{
 for(const key of ['guided_practice','independent_practice','mastery_check']) for(const q of d[key]){
  const {x,y}=q.visual;const expected=Math.hypot(x,y);
  assert.equal(parseFloat(q.answer),expected,q.id);
  assert.equal(c.gradeAnswer(q,`${expected}m`).correct,true,q.id);
  assert.equal(c.gradeAnswer(q,`${expected}`).missingUnit,true,q.id);
  assert.equal(c.gradeAnswer(q,`${x+y} m`).correct,false,q.id+' distance is not displacement');
 }
});
test('5B visuals use finite proportional coordinates and identify components/resultant',()=>{
 for(const q of d.worked_examples){const svg=c.renderVisual(q.visual);assert.ok(svg.includes('<svg'));assert.ok(svg.includes('Purple: resultant'));assert.ok(!/NaN|Infinity/.test(svg));}
});
test('5B addresses conceptual classification, direction, cancellation and sign misconceptions',()=>{
 assert.equal(d.conceptual_questions.length,4);
 for(const q of d.conceptual_questions){assert.ok(q.expected_ideas.length>=2);assert.ok(q.misconceptions.length);assert.ok(q.follow_up);}
 assert.equal(d.mastery_check.length,5);
 assert.equal(d.lesson_flow.length,6);
});
