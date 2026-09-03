import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lessonHtml = fs.readFileSync(
  new URL("../public/lesson.html", import.meta.url),
  "utf8"
);
const source = fs.readFileSync(
  new URL("../public/a10e-g03-guidance.js", import.meta.url),
  "utf8"
);

test("A.10E G03 detailed guidance is loaded", () => {
  assert.match(lessonHtml, /a10e-g03-guidance\.js/);
  assert.match(source, /A10E-G03/);
});

test("G03 progressive hints teach GCF, inner factoring, and final assembly", () => {
  assert.match(source, /greatest common factor/i);
  assert.match(source, /2\(x² − 4x \+ 4\)/);
  assert.match(source, /multiply to <strong>4<\/strong> and add to <strong>−4<\/strong>/);
  assert.match(source, /2\(x − 2\)\(x − 2\) = 2\(x − 2\)²/);
});

test("G03 Explain Another Way includes an X-method path after the GCF", () => {
  assert.match(source, /GCF first, then use the X/);
  assert.match(source, /a = 1/);
  assert.match(source, /divide both side numbers by 1/i);
});

test("G03 recognizes the student's expanded-factor answer as equivalent", () => {
  assert.match(source, /2\(x−2\)\(x−2\).*equivalent.*2\(x−2\)²/s);
});
