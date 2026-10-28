import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderCircuitVisual} from '../public/physics-circuits.mjs';
const lesson=JSON.parse(readFileSync(new URL('../public/physics-6d-series-parallel-circuits.json',import.meta.url),'utf8'));

test('series and parallel worked diagrams obey Ohm and junction laws',()=>{
  const [series,parallel]=lesson.worked_examples.map(q=>q.visual);
  assert.equal(series.arrangement,'series');
  assert.equal(parallel.arrangement,'parallel');
  assert.deepEqual([series.voltage,series.r1,series.r2],[parallel.voltage,parallel.r1,parallel.r2]);
  const current=series.voltage/(series.r1+series.r2);
  assert.equal(current,1);
  assert.equal(current*series.r1+current*series.r2,series.voltage);
  const branch1=parallel.voltage/parallel.r1,branch2=parallel.voltage/parallel.r2;
  assert.equal(branch1,3);assert.equal(branch2,1.5);
  assert.equal(parallel.voltage/(branch1+branch2),2);
  const html=renderCircuitVisual(parallel);
  assert.match(html,/3 A; 9 V across R1/);assert.match(html,/1.5 A; 9 V across R2/);
  assert.match(html,/3 \+ 1.5 = 4.5 A/);
});

test('opening a switch distinguishes broken series loop from intact parallel branch',()=>{
  const comparison=lesson.concept_cards.find(c=>c.visual?.open).visual;
  const html=renderCircuitVisual(comparison);
  assert.equal((html.match(/<svg /g)||[]).length,2);
  assert.match(html,/Both bulbs are off/);assert.match(html,/Only the lower bulb/);
  assert.match(html,/No closed loop: current = 0 A/);
  const [series,parallel]=[...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m=>m[0]);
  assert.equal((series.match(/<polygon /g)||[]).length,0);
  assert.equal((parallel.match(/<polygon /g)||[]).length,2);
});

test('circuit figures provide accessible descriptions and fit the available lesson width',()=>{
  for(const item of [...lesson.concept_cards,...lesson.worked_examples].filter(c=>c.visual)){
    const html=renderCircuitVisual(item.visual);
    assert.match(html,/role="img" aria-label="[^"]+"/);
    assert.doesNotMatch(html,/overflow-x:auto|min-width:480px/);
    assert.match(html,/grid-template-columns:minmax\(0,1fr\)/);
    assert.doesNotMatch(html,/NaN|Infinity|undefined/);
  }
  assert.equal(renderCircuitVisual({type:'circuit_diagram',arrangement:'unknown'}),'');
});

test('circuit cards use full lesson width instead of nested narrow columns',()=>{
 const html=readFileSync(new URL('../public/physics.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/physics.css',import.meta.url),'utf8');
 assert.match(html,/physics-circuit-card/);
 assert.match(css,/\.physics-circuit-card\s*\{[^}]*grid-column:1\s*\/\s*-1/);
 assert.match(css,/\.physics-workspace-active:has\(\.physics-circuit-visual\)/);
});
