import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const visual = fs.readFileSync(new URL("../public/a9a-visual-concept.js", import.meta.url), "utf8");
const help = fs.readFileSync(new URL("../public/lesson-help-upgrade.js", import.meta.url), "utf8");
const toolbar = fs.readFileSync(new URL("../public/math-symbol-toolbar.js", import.meta.url), "utf8");
const normalizer = fs.readFileSync(new URL("../public/math-input-normalizer.js", import.meta.url), "utf8");

test("approved A.9A visual concept is wired into the lesson", () => {
  assert.match(lessonHtml, /a9a-visual-concept\.js/);
  assert.match(visual, /alg1-a9a-exponential-domain-range/);
  assert.match(visual, /Positive coefficient/);
  assert.match(visual, /Negative coefficient/);
  assert.match(visual, /Decay still stays positive/);
  assert.match(visual, /Vertical shift moves the range/);
  assert.match(visual, /horizontal asymptote/i);
  assert.match(visual, /Domain/);
  assert.match(visual, /Range/);
  assert.match(visual, /observer\.disconnect\(\)/);
});

test("approved A.9A guided and independent help reaches full answers", () => {
  assert.match(lessonHtml, /lesson-help-upgrade\.js/);
  assert.match(help, /moduleId !== "alg1-a9a-exponential-domain-range"/);
  for (const id of ["A9A-G01", "A9A-G02", "A9A-G03", "A9A-P01", "A9A-P02", "A9A-P03", "A9A-P04"]) {
    assert.match(help, new RegExp(id));
  }
  assert.match(help, /Show Answer & Full Solution/);
  assert.match(help, /Final answer:/);
  assert.match(help, /range: y < 4 = \(−∞, 4\)/);
  assert.match(help, /range: y > −2 = \(−2, ∞\)/);
  assert.match(help, /domain: \{0,1,2,…,12\}/);
  assert.match(help, /Correct — here is why/);
});

test("approved math toolbar supports interval and exponential notation", () => {
  assert.match(lessonHtml, /math-symbol-toolbar\.js/);
  for (const token of ["√", "∛", "x²", "x³", "^", "+", "−", "×", "÷", "(", ")", "[", "]", "≤", "≥", "∞", "π", "±"]) {
    assert.match(toolbar, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(normalizer, /infinity\|inf/);
  assert.match(normalizer, /"∞"/);
});
