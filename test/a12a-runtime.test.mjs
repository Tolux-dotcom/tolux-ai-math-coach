import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const practice = fs.readFileSync(new URL("../public/a12a-practice.js", import.meta.url), "utf8");
const practiceHtml = fs.readFileSync(new URL("../public/practice.html", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../public/a12a-dashboard-bridge.js", import.meta.url), "utf8");
const previousBridge = fs.readFileSync(new URL("../public/a11b-dashboard-bridge.js", import.meta.url), "utf8");

test("A.12A practice reveals answer and worked reasoning after the first checked attempt", () => {
  assert.match(practice, /Not correct/);
  assert.match(practice, /Compare your work with the correct answer and explanation below/);
  assert.match(practice, /Final answer:/);
  assert.match(practice, /Why this answer is correct/);
});

test("A.12A practice keeps help readily available", () => {
  assert.match(practice, /Hint 3: complete reasoning/);
  assert.match(practice, /Another way to think about it/);
  assert.match(practice, /Step-by-step alternative explanation/);
  assert.match(practice, /Repeated outputs are allowed/);
});

test("A.12A has dedicated 5, 10, and 20 question Practice Mode routing", () => {
  assert.match(practice, /\[5,10,20\]/);
  assert.match(practiceHtml, /skill === "A\.12A"/);
  assert.match(practiceHtml, /a12a-practice\.js/);
});

test("A.12A Practice Mode records progress locally and to the account", () => {
  assert.match(practice, /LESSON_PROGRESS_PREFIX/);
  assert.match(practice, /PENDING_PROGRESS_PREFIX/);
  assert.match(practice, /practice-alg1-a12a-identify-functions/);
  assert.match(practice, /\/api\/lesson-progress/);
  assert.match(practice, /Saved to your Tolux progress dashboard/);
  assert.match(practice, /Review these questions/);
});

test("A.12A is promoted from Coming soon to a live Algebra 1A option", () => {
  assert.match(bridge, /alg1-a12a-identify-functions/);
  assert.match(bridge, /existing\.disabled = false/);
  assert.match(bridge, /delete existing\.dataset\.toluxPlaceholder/);
  assert.match(previousBridge, /a12a-dashboard-bridge\.js/);
});
