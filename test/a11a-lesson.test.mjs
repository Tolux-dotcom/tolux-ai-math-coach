import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  answersEquivalent,
  selectStageItems,
  validateLessonModule
} from "../public/lesson-core.mjs";

const module = JSON.parse(
  await readFile(new URL("../public/a11a-radical-expressions.json", import.meta.url), "utf8")
);

test("A.11A lesson bank is structurally valid and complete", () => {
  assert.equal(module.module_id, "alg1-a11a-radical-expressions");
  assert.deepEqual(module.teks, ["A.11A"]);
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(selectStageItems(module, "diagnostic").length, 3);
  assert.equal(selectStageItems(module, "guided_practice").length, 3);
  assert.equal(selectStageItems(module, "independent_practice").length, 4);
  assert.equal(selectStageItems(module, "mastery_check").length, 5);
});

test("A.11A remains numerical and teaches square-root simplification", () => {
  assert.equal(module.student_objective.includes("numerical radical expressions"), true);
  const concept = JSON.stringify(module.concept_cards);
  assert.match(concept, /perfect squares/i);
  assert.match(concept, /largest perfect-square factor/i);
  assert.match(concept, /√a·√b/);
  assert.match(concept, /like radicals/i);
  assert.ok(module.items.every(item => !/√\s*[a-z]/i.test(item.prompt)));
});

test("every A.11A answer key and authored variant grades correctly", () => {
  for (const item of module.items) {
    assert.equal(answersEquivalent(item.answer_key, item), true, item.id);
    for (const accepted of item.accepted_answers || []) {
      assert.equal(answersEquivalent(accepted, item), true, `${item.id}: ${accepted}`);
    }
  }
});

test("guided and independent A.11A items provide multi-step tutoring", () => {
  const studentWork = module.items.filter(item =>
    item.type === "guided_practice" || item.type === "independent_practice"
  );
  assert.ok(studentWork.every(item => Array.isArray(item.hint_steps) && item.hint_steps.length >= 3));
  assert.ok(studentWork.every(item => Array.isArray(item.alternate_solution_steps) && item.alternate_solution_steps.length >= 2));
  assert.ok(studentWork.every(item => Array.isArray(item.solution_steps) && item.solution_steps.length >= 2));
});

test("A.11A covers the intended misconception families", () => {
  const tags = new Set(module.items.map(item => item.diagnostic_tag));
  for (const tag of [
    "perfect_square_value",
    "perfect_square_factor",
    "extract_square",
    "product_property",
    "quotient_property",
    "like_radicals",
    "coefficient_error",
    "context_radical"
  ]) {
    assert.ok(tags.has(tag), tag);
  }
});

test("A.11A mastery includes an explanation item about the coefficient error", () => {
  const item = module.items.find(candidate => candidate.id === "A11A-M04");
  assert.equal(item.answer_key, "no");
  assert.ok(item.explanation_prompt);
  assert.ok(item.explanation_keywords.length >= 3);
});
