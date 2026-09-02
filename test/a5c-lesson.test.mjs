import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json", import.meta.url), "utf8"));
const module = JSON.parse(fs.readFileSync(new URL("../public/a5c-linear-systems.json", import.meta.url), "utf8"));

test("A.5C resolves as a structured lesson on the completion branch", () => {
  const entry = findCourseModule(catalog, "alg1-a5c-linear-systems");
  assert.ok(entry);
  assert.ok(entry.available_modes.includes("lesson"));
  assert.equal(entry.lesson_path, "/a5c-linear-systems.json");
});

test("A.5C lesson data validates", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
  assert.ok(module.misconception_routes.system_solution_meaning);
});

test("A.5C accepts equivalent ordered-pair formats", () => {
  const item = module.items.find(candidate => candidate.id === "A5C-M01");
  assert.equal(answersEquivalent("(4, 6)", item), true);
  assert.equal(answersEquivalent("x=4,y=6", item), true);
  assert.equal(answersEquivalent("x=4 y=6", item), true);
  assert.equal(answersEquivalent("y=6 x=4", item), true);
  assert.equal(answersEquivalent("x = 4  y = 6", item), true);
});

test("A.5C rejects incorrect or incomplete ordered pairs", () => {
  const item = module.items.find(candidate => candidate.id === "A5C-M01");
  assert.equal(answersEquivalent("x=6 y=4", item), false);
  assert.equal(answersEquivalent("x=4", item), false);
  assert.equal(answersEquivalent("(4, 5)", item), false);
});
