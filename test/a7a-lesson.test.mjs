import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a7a-quadratic-key-features.json", import.meta.url), "utf8"));

test("A.7A resolves as a structured lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a7a-quadratic-key-features");
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a7a-quadratic-key-features.json");
});

test("A.7A validates with 30 unique items", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
});

test("A.7A covers the full graph-feature diagnostic gate", () => {
  for (const tag of ["vertex", "axis_of_symmetry", "zeros_vs_intercepts", "maximum_minimum", "y_intercept", "symmetry", "representation_connection", "opening_direction"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.7A accepts common coordinate and feature notation", () => {
  for (const [id, answer] of [
    ["A7A-D01", "x=3 y=-4"],
    ["A7A-G01", "(-4,7), max"],
    ["A7A-P02", "(-1,0) and (5,0)"],
    ["A7A-M04", "x=-1 minimum"]
  ]) assert.equal(answersEquivalent(answer, module.items.find(item => item.id === id)), true, id);
});

test("A.7A key feature answers are mathematically correct", () => {
  const expected = {
    "A7A-L02": "zeros -2 and 6; axis x=2",
    "A7A-G02": "x = 4",
    "A7A-M02": "zeros -3 and 1; axis x=-1",
    "A7A-X07": "x = -2"
  };
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id).answer_key, answer, id);
});
