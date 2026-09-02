import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a8a-solve-quadratic-equations.json", import.meta.url), "utf8"));

test("A.8A resolves as a structured lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a8a-solve-quadratic-equations");
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a8a-solve-quadratic-equations.json");
});

test("A.8A validates with 30 unique items", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
});

test("A.8A covers every required solution method and method choice", () => {
  for (const tag of ["method_choice", "factoring", "square_root_method", "complete_square", "quadratic_formula"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.8A accepts common multi-root notation", () => {
  for (const [id, answer] of [["A8A-D02", "-2,3"], ["A8A-G01", "x=±9"], ["A8A-G01", "-9 and 9"], ["A8A-G01", "9 and -9"], ["A8A-G01", "x=-9 or x=9"], ["A8A-G03", "1,-1.5"], ["A8A-M04", "1/2,3"]]) {
    assert.equal(answersEquivalent(answer, module.items.find(item => item.id === id)), true, id);
  }
});

test("A.8A factoring grading accepts either root order and complete work", () => {
  const item = module.items.find(item => item.id === "A8A-G02");
  assert.equal(answersEquivalent("x=-4 or x=3", item), true);
  assert.equal(
    answersEquivalent("(x+4)(x-3)=0, so x=-4 or x=3", item),
    true
  );
  assert.equal(answersEquivalent("x=-4", item), false);
  assert.deepEqual(item.hint_steps, [
    "Find two numbers whose product is -12 and whose sum is 1.",
    "The numbers are 4 and -3, so write (x+4)(x-3)=0.",
    "Apply the zero-product property: x+4=0 or x-3=0. Solve both equations to get x=-4 or x=3."
  ]);
});

test("A.8A square-root help teaches both roots step by step", () => {
  const item = module.items.find(item => item.id === "A8A-G01");
  assert.match(item.hint_steps[0], /x=±√81/);
  assert.match(item.hint_steps.at(-1), /\(-9\)²=81/);
  assert.deepEqual(
    item.alternate_solution_steps.map(step => step.equation),
    ["x^2-81=0", "(x-9)(x+9)=0", "x-9=0 or x+9=0", "x=9 or x=-9"]
  );
});

test("A.8A answer keys are mathematically correct", () => {
  const expected = {"A8A-L03": "x = -1 or x = -5", "A8A-P03": "x = 2 or x = -6", "A8A-P04": "x = 2 or x = -1/3", "A8A-X11": "t = 0 or t = 4"};
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id).answer_key, answer, id);
});
