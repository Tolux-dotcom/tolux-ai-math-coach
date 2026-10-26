import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const d=JSON.parse(readFileSync(new URL('../public/physics-5e-newton-first-law.json',import.meta.url),'utf8'));
const h=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');
const c=vm.createContext({});vm.runInContext(h.slice(h.indexOf('function normalizeAnswer('),h.indexOf('function updatePath(')),c);
test('5E choice questions distinguish correct explanations from misconceptions',()=>{
 for(const k of ['guided_practice','independent_practice','mastery_check'])for(const q of d[k]){
 assert.equal(q.choices.filter(x=>x===q.answer).length,1,q.id);
 for(const choice of q.choices)assert.equal(c.gradeAnswer(q,choice).correct,choice===q.answer,q.id);
 assert.ok(q.alternate_explanation.trim().length>0);
 }
 assert.ok(h.includes('<select id="physicsAnswer"'));
});
test('5E force diagram names two forces on one object without calling them a third-law pair',()=>{
 const svg=c.renderVisual({type:'balanced_forces'});
 assert.match(svg,/Normal force from table/);assert.match(svg,/Weight from Earth/);assert.match(svg,/not a third-law pair/);
 assert.equal(d.conceptual_questions.length,3);
 assert.equal(d.lesson_flow.length,6);
});
