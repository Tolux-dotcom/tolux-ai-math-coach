import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a6a-quadratic-domain-range.json", import.meta.url), "utf8"));

test("A.6A resolves as a structured Quadratics lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a6a-quadratic-domain-range");
  assert.ok(entry);
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a6a-quadratic-domain-range.json");
});

test("A.6A has a valid 30-item diagnostic and mastery bank", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
  assert.ok(module.items.filter(item => item.critical_misconception).length >= 8);
});

test("A.6A covers vertex, opening, notation, context, and transformation diagnostics", () => {
  for (const tag of ["vertex_opening_range", "standard_form_vertex", "range_representation", "context_domain", "transformation_range"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.6A key range answers accept common student notation", () => {
  for (const [id, answer] of [["A6A-D02", "y>=-3"], ["A6A-G02", "(-∞,-1]"], ["A6A-M04", "y<=5"], ["A6A-X07", "[-4,∞)"]]) {
    const item = module.items.find(candidate => candidate.id === id);
    assert.equal(answersEquivalent(answer, item), true, id);
  }
});

test("A.6A standard-form answer keys are mathematically correct", () => {
  const expected = {"A6A-L03":"y ≥ -4","A6A-P03":"y ≥ -6","A6A-M04":"y ≤ 5","A6A-X05":"y ≥ -9","A6A-X06":"y ≤ 5"};
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id)?.answer_key, answer, id);
});
