import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('graph-related Modules 21 through 25 include visible SVG graph teaching',()=>{
  const visual=fs.readFileSync(new URL('../public/batch7-visual.js',import.meta.url),'utf8');
  assert.match(visual,/A\.2H|alg1-a2h-write-linear-inequalities/);
  assert.match(visual,/stroke-dasharray/);
  assert.match(visual,/SHADED: solutions/);
  assert.match(visual,/intersection/);
  assert.match(visual,/rise/);
  assert.match(visual,/run/);
  assert.match(visual,/Δ time/);
  assert.match(visual,/x-intercept \/ zero/);
  const svgCount=(visual.match(/<svg/g)||[]).length;
  assert.ok(svgCount>=5,'each module needs an actual graph or coordinate-plane visual');
});
