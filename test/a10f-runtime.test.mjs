import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const indexHtml = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const practiceHtml = fs.readFileSync(new URL("../public/practice.html", import.meta.url), "utf8");
const dashboardBridge = fs.readFileSync(new URL("../public/a10f-dashboard-bridge.js", import.meta.url), "utf8");
const practiceRuntime = fs.readFileSync(new URL("../public/a10f-practice.js", import.meta.url), "utf8");
const visualRuntime = fs.readFileSync(new URL("../public/a10f-visual.js", import.meta.url), "utf8");

test("A.10F is exposed on the dashboard without changing older lesson routing", () => {
  assert.match(indexHtml, /a10f-dashboard-bridge\.js/);
  assert.match(dashboardBridge, /alg1-a10f-difference-of-squares/);
  assert.match(dashboardBridge, /A\.10F/);
  assert.match(dashboardBridge, /Difference of Two Squares/);
});

test("A.10F dashboard bridge cannot create a self-triggering mutation loop", () => {
  assert.doesNotMatch(dashboardBridge, /new MutationObserver/);
  assert.match(dashboardBridge, /attempts >= 100/);
  assert.match(dashboardBridge, /setTextIfChanged/);
});

test("A.10F practice uses the dedicated verified runtime while other skills keep practice.js", () => {
  assert.match(practiceHtml, /skill === "A\.10F"/);
  assert.match(practiceHtml, /import\("\/a10f-practice\.js"\)/);
  assert.match(practiceHtml, /import\("\/practice\.js"\)/);
  assert.match(practiceRuntime, /\/a10f-difference-of-squares\.json/);
  assert.match(practiceRuntime, /\[5, 10, 20\]/);
  assert.match(practiceRuntime, /lesson-usage/);
  assert.match(practiceRuntime, /trial-heartbeat/);
  assert.match(practiceRuntime, /lesson-progress/);
});

test("A.10F lesson has responsive visual difference-of-squares teaching", () => {
  assert.match(lessonHtml, /a10f-visual\.js/);
  assert.match(visualRuntime, /square − square = conjugate factors/);
  assert.match(visualRuntime, /Two terms\?/);
  assert.match(visualRuntime, /Subtraction\?/);
  assert.match(visualRuntime, /Both squares\?/);
  assert.match(visualRuntime, /Factor completely/);
});
