import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a7b-factors-and-zeros.json", import.meta.url), "utf8"));

test("A.7B resolves as a structured lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a7b-factors-and-zeros");
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a7b-factors-and-zeros.json");
});

test("A.7B validates with 30 unique items", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
});

test("A.7B covers the factor-zero conceptual-link gate", () => {
  for (const tag of ["factor_zero_sign", "zero_product_property", "zero_intercept_connection", "factoring_to_zeros", "common_factor", "repeated_zero", "graph_factor_connection"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.7B accepts common zero and intercept notation", () => {
  for (const [id, answer] of [
    ["A7B-D02", "-2,5"],
    ["A7B-G01", "x=-7 and (-7,0)"],
    ["A7B-P04", "(x-5)^2"],
    ["A7B-M04", "(x-6)(x+2)"]
  ]) assert.equal(answersEquivalent(answer, module.items.find(item => item.id === id)), true, id);
});

test("A.7B factor and zero keys are mathematically correct", () => {
  const expected = {
    "A7B-L02": "(x-3)(x-4); zeros 3 and 4",
    "A7B-P03": "x = 0 and x = -4",
    "A7B-M02": "(x-5)(x+3); zeros 5 and -3",
    "A7B-X07": "x = 2 and x = -5"
  };
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id).answer_key, answer, id);
});
