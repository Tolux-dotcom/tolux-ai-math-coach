import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleData = JSON.parse(fs.readFileSync(new URL("../public/a12a-identify-functions.json", import.meta.url), "utf8"));
const visual = fs.readFileSync(new URL("../public/a12a-visual.js", import.meta.url), "utf8");
const help = fs.readFileSync(new URL("../public/a12a-help.js", import.meta.url), "utf8");
const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const courseCore = fs.readFileSync(new URL("../public/course-core.mjs", import.meta.url), "utf8");

const byId = id => moduleData.items.find(item => item.id === id);

test("A.12A matches the Texas function-identification standard", () => {
  assert.equal(moduleData.module_id, "alg1-a12a-identify-functions");
  assert.deepEqual(moduleData.teks, ["A.12A"]);
  assert.match(moduleData.student_objective, /verbally|table|graph|mapping|symbolically/i);
  assert.ok(moduleData.items.length >= 20);
  assert.equal(moduleData.lesson_settings.mastery_item_ids.length, 5);
});

test("A.12A explicitly teaches the two major function misconceptions", () => {
  assert.equal(byId("A12A-D02").answer_key, "not a function");
  assert.equal(byId("A12A-D03").answer_key, "function");
  assert.match(byId("A12A-D03").solution_steps.map(step => step.explanation).join(" "), /repeated outputs are allowed/i);
  assert.match(byId("A12A-G03").solution_steps.map(step => step.explanation).join(" "), /vertical line test/i);
});

test("A.12A provides visual support for mappings and the vertical line test", () => {
  assert.match(visual, /Mapping: function/);
  assert.match(visual, /Mapping: not a function/);
  assert.match(visual, /passes the vertical line test/);
  assert.match(visual, /fails the vertical line test/);
  assert.match(visual, /<svg/);
  assert.match(lessonHtml, /a12a-visual\.js/);
});

test("A.12A help reveals the correct answer and full solution after an attempt", () => {
  assert.match(help, /Final answer:/);
  assert.match(help, /wrongAttempt/);
  assert.match(help, /Check your work: answer and full solution/);
  assert.match(help, /Hint 3/);
  assert.match(help, /Another way/);
  assert.match(lessonHtml, /a12a-help\.js/);
});

test("A.12A is registered as a structured Tutor and Practice module", () => {
  assert.match(courseCore, /alg1-a12a-identify-functions/);
  assert.match(courseCore, /a12a-identify-functions\.json/);
  assert.match(courseCore, /available_modes: \["lesson", "practice"\]/);
});
