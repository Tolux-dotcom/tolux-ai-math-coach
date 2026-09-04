import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const visual = fs.readFileSync(new URL("../public/a9a-visual-concept.js", import.meta.url), "utf8");

test("A.9A lesson loads the visual exponential graph concept support", () => {
  assert.match(lessonHtml, /a9a-visual-concept\.js/);
  assert.match(visual, /alg1-a9a-exponential-domain-range/);
  assert.match(visual, /Positive coefficient/);
  assert.match(visual, /Negative coefficient/);
  assert.match(visual, /Decay still stays positive/);
  assert.match(visual, /Vertical shift moves the range/);
  assert.match(visual, /horizontal asymptote/i);
  assert.match(visual, /Domain/);
  assert.match(visual, /Range/);
  assert.match(visual, /y > 0/);
  assert.match(visual, /y < 0/);
  assert.match(visual, /y > 3/);
  assert.match(visual, /y < 3/);
});

test("A.9A concept visual uses bounded one-time DOM injection", () => {
  assert.match(visual, /if \(injectVisual\(\)\) return/);
  assert.match(visual, /observer\.disconnect\(\)/);
  assert.match(visual, /data-a9a-visual-concept/);
});
