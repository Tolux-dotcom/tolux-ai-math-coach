import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a7c-quadratic-transformations.json", import.meta.url), "utf8"));

test("A.7C resolves as a structured lesson", () => {
  const entry = findCourseModule(catalog, "alg1-a7c-quadratic-transformations");
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a7c-quadratic-transformations.json");
});

test("A.7C validates with 30 unique items", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
});

test("A.7C distinguishes required error domains", () => {
  const domains = new Set(module.items.map(item => item.error_domain));
  for (const domain of ["conceptual", "procedural", "representation", "prerequisite"]) assert.ok(domains.has(domain), domain);
  assert.ok(module.items.some(item => item.diagnostic_tag === "first_incorrect_step"));
});

test("A.7C covers all core transformation diagnostics", () => {
  for (const tag of ["horizontal_shift", "vertical_shift", "reflection_stretch", "stretch_compression", "write_transformed_equation", "point_mapping"]) {
    assert.ok(module.items.some(item => item.diagnostic_tag === tag), tag);
    assert.ok(module.misconception_routes[tag], tag);
  }
});

test("A.7C worked examples teach vertex form before identifying transformations", () => {
  const workedExamples = module.items.filter(item => item.type === "worked_example");
  assert.equal(workedExamples.length, 3);

  for (const example of workedExamples) {
    assert.equal(example.solution_steps[0].equation, "y=a(x-h)^2+k");
    assert.match(example.solution_steps[0].explanation, /vertex form/i);
    assert.ok(example.solution_steps.some(step => /a=/.test(step.equation)));
    assert.ok(example.solution_steps.some(step => /h=/.test(step.equation)));
    assert.ok(example.solution_steps.some(step => /k=/.test(step.equation)));
  }

  const firstExample = workedExamples.find(item => item.id === "A7C-L01");
  assert.match(firstExample.solution_steps[1].equation, /x-\(-2\)/);
  assert.match(firstExample.solution_steps[2].explanation, /Compare the two equations/);
  assert.match(firstExample.solution_steps.at(-1).equation, /vertex=\(h,k\)=\(-2,-5\)/);
});

test("A.7C accepts common equation and transformation notation", () => {
  for (const [id, answer] of [
    ["A7C-G01", "right shift of 3, and up shift 7"],
    ["A7C-G01", "shift 3 units right and 7 units up"],
    ["A7C-G01", "h=3, k=7"],
    ["A7C-L03", "y=0.5(x+4)^2+2"],
    ["A7C-P04", "x=-1 y=5"],
    ["A7C-M03", "y=-1(x-2)^2+5"],
    ["A7C-X09", "y=-(x-3)^2-2"]
  ]) assert.equal(answersEquivalent(answer, module.items.find(item => item.id === id)), true, id);
});

test("A.7C transformed equations and mapped points are correct", () => {
  const expected = {"A7C-G03": "y = -x^2 - 4", "A7C-P03": "y = 4(x - 3)^2", "A7C-X07": "(1,7)", "A7C-X11": "y = -(x - 6)^2 + 10"};
  for (const [id, answer] of Object.entries(expected)) assert.equal(module.items.find(item => item.id === id).answer_key, answer, id);
});
