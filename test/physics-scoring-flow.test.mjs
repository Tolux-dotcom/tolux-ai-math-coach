import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const h=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');
function setup(){
 const nodes={};const node=id=>nodes[id]||=( {value:'',hidden:true,disabled:false,textContent:'',innerHTML:'',listeners:{},addEventListener(type,fn){(this.listeners[type]||=[]).push(fn)},focus(){}} );
 const c=vm.createContext({document:{querySelector:node},lessonStages:{innerHTML:''},updatePath(){},renderConceptualReflections(){return ''},activeMode:'Tutor Mode',activeLesson:{},currentItems:[],itemIndex:0,hintLevel:0,masteryResults:[],recheckResults:[],practiceFirstAttempts:[],practiceIndex:0,originalItem:null,nextStage(){},renderTutorStage(){},renderPracticeSummary(){},renderPracticeQuestion(){},renderRecheckQuestion(){c.recheckCalls++},recheckCalls:0});
 vm.runInContext(h.slice(h.indexOf('function normalizeAnswer('),h.indexOf('function updatePath(')),c);
 vm.runInContext(h.slice(h.indexOf('function renderQuestion('),h.indexOf('function renderPracticeQuestion(')),c);
 return {c,nodes,node,fire:(id,type='click')=>{for(const fn of [...(node(id).listeners[type]||[])])fn({key:'Enter'});}};
}
test('missing-unit retries create one completed mastery record and disabled answers ignore repeated events',()=>{
 const {c,node,fire}=setup();const q={id:'q1',prompt:'Velocity?',answer:'4 m/s',accepted_answers:['4','4 m/s']};c.currentItems=[q];c.renderQuestion(q,'Mastery Check',true);
 node('#physicsAnswer').value='4';fire('#physicsCheck');assert.equal(c.masteryResults.length,0);assert.equal(node('#physicsAnswer').disabled,false);
 node('#physicsAnswer').value='4m/s';fire('#physicsCheck');assert.equal(c.masteryResults.length,1);assert.equal(c.masteryResults[0].correct,true);
 fire('#physicsCheck');assert.equal(c.masteryResults.length,1);
});
test('a remediation Next event advances exactly one item through the recheck route',()=>{
 const {c,node,fire}=setup();const q={id:'r1',prompt:'Velocity?',answer:'4 m/s',accepted_answers:['4','4 m/s']};c.currentItems=[q,q];c.renderQuestion(q,'Targeted Recheck');node('#physicsAnswer').value='4 m/s';fire('#physicsCheck');fire('#physicsNext');assert.equal(c.itemIndex,1);assert.equal(c.recheckCalls,1);assert.equal(c.recheckResults[0],true);
});
test('a similar problem does not add a scored Practice Mode attempt',()=>{
 const {c,node,fire}=setup();c.activeMode='Practice Mode';const q={prompt:'Velocity?',answer:'4 m/s',accepted_answers:['4 m/s']};c.currentItems=[q];c.renderQuestion(q,'Similar Problem',false,true);node('#physicsAnswer').value='4 m/s';fire('#physicsCheck');assert.equal(c.practiceFirstAttempts.length,0);
});
