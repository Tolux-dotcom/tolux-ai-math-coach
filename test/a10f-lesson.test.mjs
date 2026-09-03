import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  answersEquivalent,
  selectStageItems,
  validateLessonModule
} from "../public/lesson-core.mjs";

const module = JSON.parse(
  await readFile(new URL("../public/a10f-difference-of-squares.json", import.meta.url), "utf8")
);

test("A.10F lesson bank is structurally valid and complete", () => {
  assert.equal(module.module_id, "alg1-a10f-difference-of-squares");
  assert.deepEqual(module.teks, ["A.10F"]);
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.items.length, 30);
  assert.equal(new Set(module.items.map(item => item.id)).size, 30);
  assert.equal(selectStageItems(module, "diagnostic").length, 3);
  assert.equal(selectStageItems(module, "guided_practice").length, 3);
  assert.equal(selectStageItems(module, "independent_practice").length, 4);
  assert.equal(selectStageItems(module, "mastery_check").length, 5);
});

test("A.10F teaches the complete difference-of-squares decision rule", () => {
  const text = JSON.stringify(module.concept_cards);
  assert.match(text, /p²-q²/);
  assert.match(text, /subtraction/i);
  assert.match(text, /perfect squares/i);
  assert.match(text, /GCF/i);
  assert.match(text, /Factor completely/i);
  assert.match(text, /sum of squares/i);
});

test("every authored A.10F answer key and accepted answer grades correctly", () => {
  for (const item of module.items) {
    assert.equal(answersEquivalent(item.answer_key, item), true, item.id);
    for (const accepted of item.accepted_answers || []) {
      assert.equal(answersEquivalent(accepted, item), true, `${item.id}: ${accepted}`);
    }
  }
});

test("guided and independent A.10F items provide useful multi-step help", () => {
  const studentWork = module.items.filter(item =>
    item.type === "guided_practice" || item.type === "independent_practice"
  );
  assert.ok(studentWork.every(item => Array.isArray(item.hint_steps) && item.hint_steps.length >= 3));
  assert.ok(studentWork.every(item => Array.isArray(item.alternate_solution_steps) && item.alternate_solution_steps.length >= 2));
});

test("A.10F covers GCF-first, sum-vs-difference, repeated factoring, verification, and context", () => {
  const tags = new Set(module.items.map(item => item.diagnostic_tag));
  for (const tag of [
    "difference_pattern",
    "perfect_square_terms",
    "sum_vs_difference",
    "gcf_first",
    "factor_completely",
    "verification",
    "context_factorization"
  ]) {
    assert.ok(tags.has(tag), tag);
  }
});

test("A.10F mastery includes a reasoning explanation item", () => {
  const item = module.items.find(candidate => candidate.id === "A10F-M04");
  assert.ok(item.explanation_prompt);
  assert.ok(item.explanation_keywords.length >= 3);
  assert.equal(item.answer_key, "no");
});
