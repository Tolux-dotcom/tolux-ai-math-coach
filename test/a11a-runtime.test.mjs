import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const practiceHtml = fs.readFileSync(new URL("../public/practice.html", import.meta.url), "utf8");
const dashboardBridge = fs.readFileSync(new URL("../public/a11a-dashboard-bridge.js", import.meta.url), "utf8");
const completionBridge = fs.readFileSync(new URL("../public/a10f-dashboard-bridge.js", import.meta.url), "utf8");
const visualLoader = fs.readFileSync(new URL("../public/a10f-visual.js", import.meta.url), "utf8");
const visualRuntime = fs.readFileSync(new URL("../public/a11a-visual.js", import.meta.url), "utf8");
const practiceRuntime = fs.readFileSync(new URL("../public/a11a-practice.js", import.meta.url), "utf8");
const courseCore = fs.readFileSync(new URL("../public/course-core.mjs", import.meta.url), "utf8");
const mathToolbar = fs.readFileSync(new URL("../public/math-symbol-toolbar.js", import.meta.url), "utf8");
const mathNormalizer = fs.readFileSync(new URL("../public/math-input-normalizer.js", import.meta.url), "utf8");
const masteryAudit = fs.readFileSync(new URL("../public/mastery-answer-audit.js", import.meta.url), "utf8");
const lessonHelpUpgrade = fs.readFileSync(new URL("../public/lesson-help-upgrade.js", import.meta.url), "utf8");

test("A.11A is exposed in Tutor and Practice controls without a broad DOM observer", () => {
  assert.match(completionBridge, /a11a-dashboard-bridge\.js/);
  assert.match(dashboardBridge, /alg1-a11a-radical-expressions/);
  assert.match(dashboardBridge, /A\.11A/);
  assert.match(dashboardBridge, /Simplify Numerical Radicals/);
  assert.doesNotMatch(dashboardBridge, /MutationObserver/);
  assert.match(dashboardBridge, /attempts >= 100/);
});

test("A.11A is available to the lesson router", () => {
  assert.match(courseCore, /alg1-a11a-radical-expressions/);
  assert.match(courseCore, /\/a11a-radical-expressions\.json/);
  assert.match(courseCore, /available_modes: \["lesson", "practice"\]/);
});

test("A.11A practice uses its dedicated verified runtime", () => {
  assert.match(practiceHtml, /skill === "A\.11A"/);
  assert.match(practiceHtml, /import\("\/a11a-practice\.js"\)/);
  assert.match(practiceRuntime, /\/a11a-radical-expressions\.json/);
  assert.match(practiceRuntime, /\[5, 10, 20\]/);
  assert.match(practiceRuntime, /lesson-usage/);
  assert.match(practiceRuntime, /trial-heartbeat/);
  assert.match(practiceRuntime, /lesson-progress/);
});

test("A.11A lesson loads visual perfect-square-factor teaching", () => {
  assert.match(visualLoader, /a11a-visual\.js/);
  assert.match(visualRuntime, /hunt for a perfect square/i);
  assert.match(visualRuntime, /√72/);
  assert.match(visualRuntime, /√\(36 · 2\)/);
  assert.match(visualRuntime, /6√2/);
  assert.match(visualRuntime, /perfect-square-strip/);
});

test("lesson and practice expose a reusable student math-symbol keyboard", () => {
  assert.match(lessonHtml, /math-symbol-toolbar\.js/);
  assert.match(practiceHtml, /math-symbol-toolbar\.js/);
  for (const token of ["√", "∛", "x²", "x³", "^", "+", "−", "×", "÷", "≤", "≥", "∞", "π", "±"]) {
    assert.match(mathToolbar, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(mathToolbar, /selectionStart/);
  assert.match(mathToolbar, /setSelectionRange/);
  assert.match(mathToolbar, /Math symbols — tap to insert/);
  assert.match(mathNormalizer, /infinity\|inf/);
  assert.match(mathNormalizer, /"∞"/);
});

test("mastery remediation shows the student's submitted answer for grading audit", () => {
  assert.match(lessonHtml, /mastery-answer-audit\.js/);
  assert.match(masteryAudit, /Your answer/);
  assert.match(masteryAudit, /Your explanation/);
  assert.match(masteryAudit, /QA grading flag/);
  assert.match(masteryAudit, /Your final answer matches the displayed correct answer/);
  assert.match(masteryAudit, /sessionStorage/);
});

test("lesson help offers full worked solutions after a wrong guided or independent attempt", () => {
  assert.match(lessonHtml, /lesson-help-upgrade\.js/);
  assert.match(lessonHelpUpgrade, /Show Answer & Full Solution/);
  assert.match(lessonHelpUpgrade, /Solve with Tolux\|Your Turn\|Similar Problem/);
  assert.match(lessonHelpUpgrade, /Final answer:/);
  assert.match(lessonHelpUpgrade, /A9A-G01/);
  assert.match(lessonHelpUpgrade, /range: y > 0 = \(0, ∞\)/);
  assert.match(lessonHelpUpgrade, /Hint 3/);
});
