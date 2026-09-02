import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent, formatMathNotation } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a8b-quadratic-regression.json", import.meta.url), "utf8"));

test("A.8B resolves as a structured lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a8b-quadratic-regression");
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a8b-quadratic-regression.json");
});

test("A.8B validates with 30 unique items", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
});

test("A.8B covers the full data-modeling quality gate", () => {
  for (const tag of ["model_selection", "technology_setup", "prediction", "residual", "interpolation_extrapolation", "context_domain"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.8B accepts common regression responses", () => {
  for (const [id, answer] of [["A8B-D03", "residual=2"], ["A8B-G02", "y=20"], ["A8B-P04", "a=1.84"], ["A8B-X11", "x=10"]]) {
    assert.equal(answersEquivalent(answer, module.items.find(item => item.id === id)), true, id);
  }
});

test("A.8B answer keys are mathematically correct", () => {
  const expected = {"A8B-L01":"y = x^2 + 2x + 1","A8B-L02":"21","A8B-P02":"25","A8B-M02":"26","A8B-X06":"13","A8B-X11":"10"};
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id).answer_key, answer, id);
});

test("A.8B powers render with standard superscripts", () => {
  assert.equal(formatMathNotation(module.items.find(item => item.id === "A8B-M02").prompt), "Use y=-x²+10x+2 to predict y at x=4.");
});
