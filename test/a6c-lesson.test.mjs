import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a6c-write-quadratics-from-solutions.json", import.meta.url), "utf8"));

test("A.6C resolves as a structured lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a6c-write-quadratics-from-solutions");
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a6c-write-quadratics-from-solutions.json");
});

test("A.6C validates with 30 unique items", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
});

test("A.6C covers required representation diagnostics", () => {
  for (const tag of ["factor_sign", "zeros_to_factors", "graph_intercepts", "scale_factor", "expand_factored_form"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.6C answer keys accept compact and reordered factors", () => {
  for (const [id, answer] of [
    ["A6C-D02", "y=a(x-5)(x+2)"],
    ["A6C-P02", "y=3(x-2)(x+2)"],
    ["A6C-M03", "y=(x-6)(x+1)"],
    ["A6C-M04", "y=3x^2+6x-24"]
  ]) assert.equal(answersEquivalent(answer, module.items.find(item => item.id === id)), true, id);
});

test("A.6C numeric models and expansions are correct", () => {
  const expected = {
    "A6C-G02": "a = 2",
    "A6C-P02": "y = 3(x + 2)(x - 2)",
    "A6C-M02": "y = -2(x + 4)(x - 2)",
    "A6C-X07": "y = -3x^2 + 15x - 12"
  };
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id).answer_key, answer, id);
});
