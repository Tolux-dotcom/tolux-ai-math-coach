import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const d=JSON.parse(readFileSync(new URL('../public/physics-5d-circular-projectile.json',import.meta.url),'utf8'));
const h=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');
const c=vm.createContext({});vm.runInContext(h.slice(h.indexOf('function normalizeAnswer('),h.indexOf('function updatePath(')),c);
test('5D answer keys agree with circular acceleration and horizontal displacement',()=>{
 for(const key of ['guided_practice','independent_practice','mastery_check'])for(const q of d[key]){
 const nums=[...q.prompt.matchAll(/\d+/g)].map(x=>Number(x[0]));
 const expected=q.visual.type==='circular_motion'?nums[0]**2/nums[1]:nums[0]*nums[1];
 assert.equal(parseFloat(q.answer),expected,q.id);
 assert.equal(c.gradeAnswer(q,q.answer.replaceAll(' ','')).correct,true,q.id);
 assert.equal(c.gradeAnswer(q,String(expected)).missingUnit,true,q.id);
 }
});
test('5D circular and projectile visuals identify distinct velocity and acceleration roles',()=>{
 assert.match(c.renderVisual({type:'circular_motion'}),/tangent/);
 assert.match(c.renderVisual({type:'projectile_motion'}),/equal time intervals/);
 assert.equal(d.conceptual_questions.length,4);
 for(const q of d.conceptual_questions){assert.ok(q.expected_ideas.length>=2);assert.ok(q.misconceptions.length);}
});
