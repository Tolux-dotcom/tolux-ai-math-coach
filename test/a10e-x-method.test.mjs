import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lessonHtml = fs.readFileSync(
  new URL("../public/lesson.html", import.meta.url),
  "utf8"
);
const source = fs.readFileSync(
  new URL("../public/a10e-x-method.js", import.meta.url),
  "utf8"
);

test("A.10E X-method support is loaded on lesson pages", () => {
  assert.match(lessonHtml, /a10e-x-method\.js/);
  assert.match(source, /alg1-a10e-factor-trinomials/);
});

test("visual X method labels ac at the top and b at the bottom", () => {
  assert.match(source, /x-method-top/);
  assert.match(source, /<small>ac<\/small>/);
  assert.match(source, /x-method-bottom/);
  assert.match(source, /<small>b<\/small>/);
  assert.match(source, /multiply to <strong>\$\{valueText\(example\.ac\)\}<\/strong> and add to/);
});

test("worked examples include the approved perfect-square and general X-method cases", () => {
  assert.match(source, /"A10E-L02"/);
  assert.match(source, /expression: "6x² \+ 11x \+ 3"/);
  assert.match(source, /answer: "\(2x \+ 3\)\(3x \+ 1\)"/);
  assert.match(source, /"A10E-L03"/);
  assert.match(source, /expression: "4x² − 12x \+ 9"/);
  assert.match(source, /answer: "\(2x − 3\)²"/);
});

test("guided practice gets an incomplete X scaffold before the side numbers are revealed", () => {
  assert.match(source, /id !== "A10E-G02"/);
  assert.match(source, /reveal: "scaffold"/);
  assert.match(source, /Your X: fill the two side numbers/);
});

test("X-method help is connected to I'm Stuck and Explain Another Way", () => {
  assert.match(source, /#lessonExplainBtn, #lessonStuckBtn/);
  assert.match(source, /Hint: set up the X/);
  assert.match(source, /Another way: draw the X/);
});

test("divide-by-a step uses the reduced fraction bottoms-up rule instead of a false binomial equality", () => {
  assert.match(source, /Bottoms up:/);
  assert.match(source, /use the denominator as the coefficient of x and the numerator as the constant/i);
  assert.doesNotMatch(source, /\(x\s*[+−-].*\/.*\)\s*=\s*\(\d*x/);
});
