import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../public/physics.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function normalizeAnswer('), html.indexOf('function escapeHtml('));
const context = vm.createContext({});
vm.runInContext(source, context);
const lesson = JSON.parse(readFileSync(new URL('../public/physics-5c-one-dimensional-motion.json', import.meta.url), 'utf8'));
const item = lesson.guided_practice?.find(i=>i.id==='5C-G02') || Object.values(lesson).filter(Array.isArray).flat().find(i=>i.id==='5C-G02');
test('velocity accepts compact, spaced and word units without accepting wrong dimensions', () => {
 const question = { answer:'4 m/s', accepted_answers:['4','4 m/s','+4 m/s'] };
 for (const answer of ['4m/s','4 m/s','4 meters per second','4 metres per second','+4m/s']) assert.equal(context.gradeAnswer(question,answer).correct,true,answer);
 for (const answer of ['4 m/s2','4 m/s²','-4m/s','5m/s','4 bananas']) assert.equal(context.gradeAnswer(question,answer).correct,false,answer);
 assert.equal(context.gradeAnswer(question,'4').missingUnit,true);
});
test('acceleration accepts compact units while rejecting velocity units', () => {
 const question={answer:'3 m/s²',accepted_answers:['3','3 m/s²']};
 for(const answer of ['3m/s²','3 m/s2','3 meters per second squared']) assert.equal(context.gradeAnswer(question,answer).correct,true,answer);
 assert.equal(context.gradeAnswer(question,'3m/s').correct,false);
});
test('cyclist explanation includes displacement, equation, direction and a check',()=>{
 assert.ok(item);
 assert.equal(item.alternate_explanation_steps.length,5);
 assert.match(item.alternate_explanation_steps.join(' '),/20 − \(−4\)/);
 assert.match(item.alternate_explanation_steps.join(' '),/right/);
 assert.ok(html.includes('item.alternate_explanation_steps.map'));
});
