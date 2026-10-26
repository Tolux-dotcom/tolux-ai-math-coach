import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const dir=new URL('../public/',import.meta.url);
const all=readdirSync(dir).filter(f=>/^physics-.*\.json$/.test(f)&&f!=='physics-course.json').map(f=>JSON.parse(readFileSync(new URL(f,dir),'utf8')));
const h=readFileSync(new URL('physics.html',dir),'utf8');const c=vm.createContext({});vm.runInContext(h.slice(h.indexOf('function normalizeAnswer('),h.indexOf('function updatePath(')),c);
test('all 29 lessons have interactive phases, questions and nonempty mastery sets',()=>{
 assert.equal(all.length,29);
 for(const d of all){assert.equal(d.lesson_flow.length,6,d.lesson_id);for(const key of ['concept_cards','worked_examples','guided_practice','independent_practice','mastery_check'])assert.ok(d[key]?.length,d.lesson_id+' '+key);}
});
test('all expanded draft choice keys render and distinguish authored distractors',()=>{
 for(const d of all.filter(x=>x.development_status))for(const key of ['guided_practice','independent_practice','mastery_check'])for(const q of d[key]){
 assert.ok(q.choices.includes(q.answer),q.id);for(const a of q.choices)assert.equal(c.gradeAnswer(q,a).correct,a===q.answer,q.id);
 }
});
test('remaining drafts include topic diagrams, conceptual rubrics and honest pending status',()=>{
 const drafts=all.filter(x=>x.development_status);assert.equal(drafts.length,21);
 for(const d of drafts){assert.ok(d.conceptual_questions.length>=2);const v=d.concept_cards.find(x=>x.visual)?.visual;assert.ok(v,d.lesson_id);const svg=c.renderVisual(v);assert.ok(svg.includes('<svg'));assert.ok(!/NaN|Infinity/.test(svg));assert.equal(d.development_status.automated_written_reasoning,'pending');}
});
