import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const notation = fs.readFileSync(new URL("../public/a11b-math-notation.js", import.meta.url), "utf8");
const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const practiceHtml = fs.readFileSync(new URL("../public/practice.html", import.meta.url), "utf8");

test("A.11B notation renderer converts caret notation into superscript elements", () => {
  assert.match(notation, /EXPONENT_PATTERN/);
  assert.match(notation, /document\.createElement\("sup"\)/);
  assert.match(notation, /\^\\\(\(\[\^\)\]\+\)\\\)/);
  assert.match(notation, /\^\(-\?\\d\+\|\[A-Za-z\]\)/);
  assert.match(notation, /replace\(\/-\/g, "−"\)/);
});

test("A.11B notation renderer is scoped and follows dynamic lesson content", () => {
  assert.match(notation, /alg1-a11b-laws-of-exponents/);
  assert.match(notation, /params\.get\("skill"\) === "A\.11B"/);
  assert.match(notation, /#lessonContent/);
  assert.match(notation, /#lessonFeedback/);
  assert.match(notation, /#practiceQuestionView/);
  assert.match(notation, /MutationObserver/);
  assert.match(notation, /observer\.disconnect\(\)/);
});

test("lesson and practice pages load the A.11B notation renderer", () => {
  assert.match(lessonHtml, /a11b-math-notation\.js/);
  assert.match(practiceHtml, /a11b-math-notation\.js/);
});
