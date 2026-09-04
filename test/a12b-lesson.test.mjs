import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const module=JSON.parse(fs.readFileSync(new URL('../public/a12b-evaluate-functions.json',import.meta.url),'utf8'));
const visual=fs.readFileSync(new URL('../public/a12b-visual.js',import.meta.url),'utf8');
const help=fs.readFileSync(new URL('../public/a12b-help.js',import.meta.url),'utf8');
test('A.12B has complete lesson flow and mastery bank',()=>{assert.equal(module.module_id,'alg1-a12b-evaluate-functions');assert.deepEqual(module.teks,['A.12B']);assert.equal(module.lesson_flow.length,7);assert.equal(module.lesson_settings.mastery_item_ids.length,5);assert.ok(module.items.length>=20);});
test('A.12B teaches visual substitution and negative inputs',()=>{assert.match(visual,/Function machine/);assert.match(visual,/Negative input: use parentheses/);assert.match(visual,/Several inputs stay separate/);assert.match(visual,/f\(5\)=3\(5\)-4=15-4=11/);});
test('A.12B help reveals correct answer and complete reasoning',()=>{assert.match(help,/Final answer:/);assert.match(help,/hint\\s\*3/);assert.match(help,/another way/i);assert.match(help,/Check your work: answer and full solution/);});
test('A.12B uses classroom mathematical notation',()=>{const text=JSON.stringify(module);assert.doesNotMatch(text,/\bx\^\d|\bt\^\d/);assert.match(text,/x²|t²/);});