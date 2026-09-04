import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const flowPath = new URL('../public/batch8-attempt-flow.js', import.meta.url);
const lessonPath = new URL('../public/lesson.html', import.meta.url);

test('Batch 8 wrong-attempt flow allows student to continue after solution reveal', async () => {
  const source = await fs.readFile(flowPath, 'utf8');
  assert.match(source, /Review Solution & Continue/);
  assert.match(source, /next\.style\.display\s*=\s*'inline-block'/);
  assert.match(source, /answer\.disabled\s*=\s*true/);
  assert.match(source, /check\.disabled\s*=\s*true/);
});

test('A.3D multipart response distinguishes correct graph description from missing y-form', async () => {
  const source = await fs.readFile(flowPath, 'utf8');
  assert.match(source, /A3D-G03/);
  assert.match(source, /Partly correct/);
  assert.match(source, /Your graph description is correct/);
  assert.match(source, /y &gt; -2x \+ 6/);
});

test('lesson page loads Batch 8 attempt-flow guard after Batch 8 help', async () => {
  const html = await fs.readFile(lessonPath, 'utf8');
  const helpIndex = html.indexOf('/batch8-help.js');
  const flowIndex = html.indexOf('/batch8-attempt-flow.js');
  assert.ok(helpIndex >= 0);
  assert.ok(flowIndex > helpIndex);
});
