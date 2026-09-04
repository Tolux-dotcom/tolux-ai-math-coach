import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { answersEquivalent, validateLessonModule } from "../public/lesson-core.mjs";

const module = JSON.parse(fs.readFileSync(new URL("../public/a11b-laws-of-exponents.json", import.meta.url), "utf8"));

test("A.11B lesson bank is valid and covers integral and rational exponent laws", () => {
  assert.deepEqual(validateLessonModule(module), []);
  assert.equal(module.module_id, "alg1-a11b-laws-of-exponents");
  assert.deepEqual(module.teks, ["A.11B"]);
  assert.equal(module.items.length, 30);
  assert.equal(module.items.filter(item => item.type === "worked_example").length, 3);
  assert.equal(module.lesson_settings.guided_item_ids.length, 3);
  assert.equal(module.lesson_settings.independent_item_ids.length, 4);
  assert.equal(module.lesson_settings.mastery_item_ids.length, 5);
  assert.match(module.student_objective, /integral and rational exponents/i);
});

test("A.11B includes all major exponent structures", () => {
  const tags = new Set(module.items.map(item => item.diagnostic_tag));
  for (const tag of ["product_rule", "quotient_rule", "power_of_power", "power_of_product", "zero_exponent", "negative_exponent", "rational_exponent"]) {
    assert.ok(tags.has(tag), `missing ${tag}`);
  }
});

test("A.11B accepted answers handle typed and superscript exponent forms", () => {
  const byId = new Map(module.items.map(item => [item.id, item]));
  assert.equal(answersEquivalent("x⁷", byId.get("A11B-D01")), true);
  assert.equal(answersEquivalent("m¹²", byId.get("A11B-G02")), true);
  assert.equal(answersEquivalent("27a⁶", byId.get("A11B-P02")), true);
  assert.equal(answersEquivalent("1/x³", byId.get("A11B-L02")), true);
  assert.equal(answersEquivalent("4", byId.get("A11B-P04")), true);
});

test("A.11B guided and independent questions reach the answer through hints", () => {
  const selected = module.items.filter(item => ["guided_practice", "independent_practice"].includes(item.type));
  for (const item of selected) {
    assert.ok(Array.isArray(item.hint_steps) && item.hint_steps.length >= 3, `${item.id} needs three hints`);
    assert.ok(Array.isArray(item.solution_steps) && item.solution_steps.length >= 1, `${item.id} needs worked steps`);
  }
});

test("A.11B mastery explanation checks the product-rule reasoning", () => {
  const item = module.items.find(candidate => candidate.id === "A11B-M05");
  assert.equal(item.answer_key, "no");
  assert.ok(item.explanation_prompt);
  assert.ok(item.minimum_explanation_keyword_groups >= 2);
});