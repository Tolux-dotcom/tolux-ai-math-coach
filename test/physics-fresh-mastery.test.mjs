import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const dir=new URL('../public/',import.meta.url);
const lessons=readdirSync(dir).filter(f=>/^physics-.*\.json$/.test(f)&&f!=='physics-course.json').map(f=>JSON.parse(readFileSync(new URL(f,dir),'utf8')));
function prompts(items){return items.flatMap(q=>[q.prompt,...(q.similar_problem?prompts([q.similar_problem]):[])]).filter(Boolean);}
test('each lesson has five mastery prompts absent from teaching, practice, similar items and remediation',()=>{
 for(const d of lessons){
 const taught=new Set(prompts([...(d.worked_examples||[]),...(d.guided_practice||[]),...(d.independent_practice||[]),...(d.practice?.problems||[]),...(d.remediation?.recheck||[])]));
 assert.equal(d.mastery_check.length,5,d.lesson_id);
 assert.equal(new Set(d.mastery_check.map(q=>q.prompt)).size,5,d.lesson_id);
 for(const q of d.mastery_check)assert.equal(taught.has(q.prompt),false,d.lesson_id+' '+q.id+' repeats teaching');
 }
});
test('new numerical mastery keys agree with independent physical relationships',()=>{
 for(const d of lessons)for(const q of d.mastery_check){
 const p=q.calculation_check;if(!p)continue;let expected;
 switch(p.operation){
 case 'inverse_square':expected=p.initial/p.factor**2;break;
 case 'product':expected=p.values.reduce((a,b)=>a*b,1);break;
 case 'series_current':expected=p.voltage/p.resistances.reduce((a,b)=>a+b,0);break;
 case 'electric_power':expected=p.voltage**2/p.resistance;break;
 case 'work':expected=p.force*p.distance*p.cosine;break;
 case 'kinetic':expected=.5*p.mass*p.speed**2;break;
 case 'energy_balance':expected=p.total-p.potential;break;
 case 'impulse':expected=p.force*p.time;break;
 case 'inelastic':expected=(p.m1*p.v1+p.m2*p.v2)/(p.m1+p.m2);break;
 case 'square_root':expected=Math.sqrt(p.value);break;
 case 'wave':expected=p.wavelength/p.period;break;
 case 'subtract':expected=p.initial-p.cost;break;
 case 'polarizer':expected=p.input*p.cosine**2;break;
 default:throw Error(p.operation);
 }
 assert.ok(Math.abs(parseFloat(q.answer.replace('−','-'))-expected)<1e-9,q.id);
 }
});
