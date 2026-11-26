import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Test Prep hidden Retry overrides the shared inline-flex button style', () => {
  const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-test-prep-retry-save\]\[hidden\]\s*\{\s*display:\s*none\s*;\s*\}/);
});
