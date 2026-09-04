import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const courseCore = fs.readFileSync(new URL("../public/course-core.mjs", import.meta.url), "utf8");
const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const practiceHtml = fs.readFileSync(new URL("../public/practice.html", import.meta.url), "utf8");
const visual = fs.readFileSync(new URL("../public/a11b-visual.js", import.meta.url), "utf8");
const dashboardBridge = fs.readFileSync(new URL("../public/a11b-dashboard-bridge.js", import.meta.url), "utf8");
const a11aBridge = fs.readFileSync(new URL("../public/a11a-dashboard-bridge.js", import.meta.url), "utf8");
const practiceRuntime = fs.readFileSync(new URL("../public/a11b-practice.js", import.meta.url), "utf8");

test("A.11B is available to Tutor and Practice routing", () => {
  assert.match(courseCore, /alg1-a11b-laws-of-exponents/);
  assert.match(courseCore, /\/a11b-laws-of-exponents\.json/);
  assert.match(courseCore, /available_modes: \["lesson", "practice"\]/);
  assert.match(dashboardBridge, /A\.11B • Laws of Exponents/);
  assert.match(a11aBridge, /a11b-dashboard-bridge\.js/);
});

test("A.11B lesson loads a visual exponent-law decision map", () => {
  assert.match(lessonHtml, /a11b-visual\.js/);
  assert.match(visual, /Same base multiplied → ADD exponents/);
  assert.match(visual, /Same base divided → SUBTRACT exponents/);
  assert.match(visual, /Power raised to a power → MULTIPLY exponents/);
  assert.match(visual, /Negative exponent → RECIPROCAL/);
  assert.match(visual, /Rational exponent → ROOT \+ POWER/);
  assert.match(visual, /denominator = root/);
  assert.match(visual, /observer\.disconnect\(\)/);
});

test("A.11B Practice Mode routes to the dedicated structured runtime", () => {
  assert.match(practiceHtml, /skill === "A\.11B"/);
  assert.match(practiceHtml, /a11b-practice\.js/);
  assert.match(practiceRuntime, /\/a11b-laws-of-exponents\.json/);
  assert.match(practiceRuntime, /\[5, 10, 20\]/);
  assert.match(practiceRuntime, /lesson-usage/);
  assert.match(practiceRuntime, /trial-heartbeat/);
  assert.match(practiceRuntime, /lesson-progress/);
  assert.match(practiceRuntime, /Show Answer & Full Solution/);
  assert.match(practiceRuntime, /Hint \$\{record\.hint_count\}/);
});