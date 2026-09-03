import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { answersEquivalent } from "../public/lesson-core.mjs";

const module = JSON.parse(fs.readFileSync(
  new URL("../public/a10e-factor-trinomials.json", import.meta.url),
  "utf8"
));
const lessonHtml = fs.readFileSync(
  new URL("../public/lesson.html", import.meta.url),
  "utf8"
);
const alignmentSource = fs.readFileSync(
  new URL("../public/a10e-g02-alignment.js", import.meta.url),
  "utf8"
);

const g02 = module.items.find(item => item.id === "A10E-G02");

test("A.10E G02 asks for the divided X-side values rather than final factors", () => {
  assert.match(g02.prompt, /Divide BOTH side numbers by a=2/i);
  assert.match(g02.prompt, /Enter both values/i);
  assert.equal(g02.answer_key, "3 and 1/2");
  assert.match(g02.tutor_behavior, /do not enter the final factors yet/i);
});

test("A.10E G02 accepts the student's correct order-independent divided values", () => {
  assert.equal(answersEquivalent("3 and 1/2", g02), true);
  assert.equal(answersEquivalent("1/2 and 3", g02), true);
  assert.equal(answersEquivalent("1/2, 3", g02), true);
  assert.equal(answersEquivalent("(2x+1)(x+3)", g02), false);
});

test("A.10E G02 visual and answer label are aligned with the divide-by-a checkpoint", () => {
  assert.match(lessonHtml, /a10e-g02-alignment\.js/);
  assert.match(alignmentSource, /Your divided results/);
  assert.match(alignmentSource, /The X-side numbers are/);
  assert.match(alignmentSource, /divide <strong>BOTH<\/strong> side numbers by <strong>a = 2<\/strong>/);
  assert.match(alignmentSource, /left\.textContent = "6"/);
  assert.match(alignmentSource, /right\.textContent = "1"/);
});
