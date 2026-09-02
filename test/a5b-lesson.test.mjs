import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a5b-linear-inequalities.json", import.meta.url), "utf8"));

test("A.5B resolves as a structured lesson on the completion branch", () => {
  const entry = findCourseModule(catalog, "alg1-a5b-linear-inequalities");
  assert.ok(entry);
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a5b-linear-inequalities.json");
});

test("A.5B lesson data validates", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
  assert.ok(module.misconception_routes.negative_division_reversal);
});

test("A.5B reasoning mastery item requires explanation", () => {
  const reasoning = module.items.find(item => item.id === "A5B-M05");
  assert.ok(reasoning.explanation_prompt);
  assert.equal(reasoning.critical_misconception, true);
  assert.equal(answersEquivalent("x < -4", reasoning), true);
});

test("A.5B core answer keys are mathematically correct", () => {
  const expected = {
    "A5B-D01": "x > 7",
    "A5B-D02": "x < -4",
    "A5B-G01": "x ≥ 4",
    "A5B-G02": "x > -6",
    "A5B-P01": "x > 7",
    "A5B-P02": "x ≤ -3",
    "A5B-M01": "x < 4",
    "A5B-M02": "x ≥ -5",
    "A5B-M03": "x > -3",
    "A5B-M04": "x ≤ -2",
    "A5B-M05": "x < -4"
  };
  for (const [id, answer] of Object.entries(expected)) {
    assert.equal(module.items.find(item => item.id === id)?.answer_key, answer, id);
  }
});
