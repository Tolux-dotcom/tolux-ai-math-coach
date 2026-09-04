import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const normalizer = fs.readFileSync(new URL('../public/a3d-answer-normalizer.js', import.meta.url), 'utf8');
const lesson = fs.readFileSync(new URL('../public/lesson.html', import.meta.url), 'utf8');
const practice = fs.readFileSync(new URL('../public/practice.html', import.meta.url), 'utf8');

test('A.3D accepts natural-language boundary style and shading descriptions', () => {
  assert.match(normalizer, /\bsolid\b/);
  assert.match(normalizer, /\b(?:dashed\|dash)\b/);
  assert.match(normalizer, /\babove\b/);
  assert.match(normalizer, /\bbelow\b/);
  assert.match(normalizer, /return `\$\{style\}; \$\{direction\}`/);
});

test('A.3D preserves and canonicalizes a rewritten y-form inequality with graph wording', () => {
  assert.match(normalizer, /const equationMatch = normalized\.match/);
  assert.match(normalizer, /\by\\s\*\(\?:>=\|<=\|>\|<\|≥\|≤\)/);
  assert.match(normalizer, /return `\$\{equation\}; \$\{style\}; \$\{direction\}`/);
  assert.match(normalizer, /replace\(\/>=\/g, "≥"\)/);
  assert.match(normalizer, /replace\(\/<=\/g, "≤"\)/);
});

test('A.3D normalizer runs before lesson and practice grading', () => {
  assert.ok(lesson.indexOf('/a3d-answer-normalizer.js') < lesson.indexOf('/lesson.js'));
  assert.ok(practice.includes('/a3d-answer-normalizer.js'));
  assert.ok(practice.indexOf('/a3d-answer-normalizer.js') < practice.indexOf('type="module"'));
});
