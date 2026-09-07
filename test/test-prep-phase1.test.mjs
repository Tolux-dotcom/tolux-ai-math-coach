import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const core = read("public/test-prep-core.mjs");
const page = read("public/test-prep.html");
const runtime = read("public/test-prep.js");
const bridge = read("public/test-prep-dashboard.js");
const chain = read("public/a10f-dashboard-bridge.js");

test("Test Prep uses the current 50-question 59-point Algebra I blueprint shape", () => {
  assert.match(core, /totalQuestions:\s*50/);
  assert.match(core, /totalPoints:\s*59/);
  assert.match(core, /targetQuestions:\s*10/);
  assert.match(core, /targetQuestions:\s*11/);
  assert.match(core, /targetQuestions:\s*13/);
  assert.match(core, /targetQuestions:\s*6/);
  assert.match(core, /twoPointItems/);
});

test("all 49 Algebra 1 content standards are mapped into five reporting categories", () => {
  const standardMatches = core.match(/"A\.\d+[A-Z]"/g) || [];
  const unique = new Set(standardMatches.map(value => value.slice(1, -1)));
  assert.equal(unique.size, 49);
  for (const category of [1,2,3,4,5]) {
    assert.match(core, new RegExp(`\\s${category}: \\[`));
  }
});

test("Test Prep loads audited lesson-bank items instead of inventing a disconnected curriculum", () => {
  assert.match(core, /LESSON_PATHS/);
  assert.match(core, /mastery_check/);
  assert.match(core, /independent_practice/);
  assert.match(core, /accepted_answers/);
  assert.match(core, /solution_steps/);
  assert.match(core, /lessonUrl/);
});

test("Phase 1 provides quick domain and full simulation modes", () => {
  assert.match(page, /Quick Practice/);
  assert.match(page, /Domain Practice/);
  assert.match(page, /Algebra 1 EOC Simulation/);
  assert.match(runtime, /begin\("quick"\)/);
  assert.match(runtime, /begin\("domain"/);
  assert.match(runtime, /begin\("full"\)/);
});

test("results diagnose reporting categories and route missed skills to remediation", () => {
  assert.match(runtime, /categoryResults/);
  assert.match(runtime, /Targeted remediation/);
  assert.match(runtime, /Review .* Lesson/);
  assert.match(runtime, /toluxTestPrepAttempts/);
});

test("A.3F Test Prep renders a real coordinate plane from equations", () => {
  assert.match(runtime, /parseLinear/);
  assert.match(runtime, /extractLinearEquations/);
  assert.match(runtime, /graphLines/);
  assert.match(runtime, /question\.skill === "A\.3F"/);
  assert.match(runtime, /Numbered coordinate plane/);
});

test("dashboard bridge turns Test Prep from coming soon into a live Phase 1 preview", () => {
  assert.match(chain, /test-prep-dashboard\.js/);
  assert.match(bridge, /button\.disabled = false/);
  assert.match(bridge, /Algebra 1 STAAR \/ EOC practice/);
  assert.match(bridge, /window\.location\.href = '\/test-prep\.html'/);
});
