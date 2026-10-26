import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>JSON.parse(readFileSync(new URL('../public/'+name,import.meta.url),'utf8'));
const h=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');const c=vm.createContext({});vm.runInContext(h.slice(h.indexOf('function normalizeAnswer('),h.indexOf('function updatePath(')),c);
test('5F uses net force divided by mass with consistent signs',()=>{
 const d=read('physics-5f-newton-second-law.json');
 for(const k of ['guided_practice','independent_practice','mastery_check'])for(const q of d[k]){
 const mass=Number(q.prompt.match(/A (\d+) kg/)[1]);const expected=(q.visual.right-q.visual.left)/mass;
 assert.equal(parseFloat(q.answer),expected,q.id);assert.equal(c.gradeAnswer(q,q.answer).correct,true);assert.equal(c.gradeAnswer(q,String(expected)).missingUnit,true);
 assert.ok(!/NaN|Infinity/.test(c.renderVisual(q.visual)));
 }
});
test('5G and 5H choice keys are present and distractors fail',()=>{
 for(const name of ['physics-5g-newton-third-law.json','physics-5h-gravitation.json']){
 const d=read(name);assert.equal(d.mastery_check.length,5);assert.ok(d.conceptual_questions.length>=2);
 for(const k of ['guided_practice','independent_practice','mastery_check'])for(const q of d[k]){
 assert.ok(q.choices.includes(q.answer));for(const choice of q.choices)assert.equal(c.gradeAnswer(q,choice).correct,choice===q.answer,q.id);
 }
 }
});
