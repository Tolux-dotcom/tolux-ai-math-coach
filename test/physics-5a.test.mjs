import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const lesson=JSON.parse(readFileSync(new URL('../public/physics-5a-motion-graphs.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function normalizeAnswer('),html.indexOf('function updatePath(')),ctx);
test('5A numerical keys agree with slope or signed rectangular area',()=>{
 const sets=['guided_practice','independent_practice','mastery_check'];
 for(const set of sets) for(const q of lesson[set]){
  const [[t0,y0],[t1,y1]]=q.visual.points;
  const area=q.prompt.includes('stays at');
  const expected=area?y0*(t1-t0):(y1-y0)/(t1-t0);
  assert.equal(Number.parseFloat(q.answer),expected,q.id);
  assert.equal(ctx.gradeAnswer(q,q.answer).correct,true,q.id);
  assert.equal(ctx.gradeAnswer(q,q.answer.replaceAll(' ', '')).correct,true,q.id);
  assert.equal(ctx.gradeAnswer(q,String(expected)).correct,false,q.id+' requires unit');
 }
});
test('motion graphs render labeled axes, negative values, points and accessible data',()=>{
 for(const q of [...lesson.concept_cards,...lesson.worked_examples,...lesson.mastery_check]){
  const svg=ctx.renderVisual(q.visual);
  assert.ok(svg.includes('<svg'),q.title||q.id);
  assert.ok(svg.includes('time (s)'));
  assert.ok(svg.includes('Graph data in words'));
  assert.ok(!/NaN|Infinity/.test(svg));
 }
});
test('5A includes distinct conceptual reasoning tasks and all lesson phases',()=>{
 assert.equal(lesson.lesson_flow.length,6);
 assert.equal(lesson.worked_examples.length,4);
 assert.equal(lesson.mastery_check.length,5);
 assert.equal(lesson.conceptual_questions.length,4);
 for(const q of lesson.conceptual_questions){ assert.ok(q.expected_ideas.length>=2); assert.ok(q.misconceptions.length); assert.ok(q.follow_up); }
 assert.ok(html.includes('not automatically scored'));
});
