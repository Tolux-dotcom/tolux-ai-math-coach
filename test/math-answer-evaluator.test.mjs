import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSpecialAnswer,
  equationsEquivalent,
  expressionsEquivalent,
  mathAnswersEquivalent
} from "../public/math-answer-evaluator.mjs";

test("accepts reordered equivalent linear expressions", () => {
  assert.equal(expressionsEquivalent("12 + 3x", "3x + 12"), true);
  assert.equal(mathAnswersEquivalent("2(x + 4) + x + 4", "3x + 12"), true);
});

test("rejects non-equivalent expressions", () => {
  assert.equal(expressionsEquivalent("3x + 4", "3x + 12"), false);
});

test("accepts equivalent simple fractions and decimals", () => {
  assert.equal(mathAnswersEquivalent("1/2", "0.5"), true);
  assert.equal(mathAnswersEquivalent("x = 1/2", "x = 0.5"), true);
});

test("accepts equivalent linear equations by solution set", () => {
  assert.equal(equationsEquivalent("2x + 4 = 10", "x = 3"), true);
  assert.equal(equationsEquivalent("4x + 8 = 20", "x = 3"), true);
});

test("distinguishes equations with different solutions", () => {
  assert.equal(equationsEquivalent("2x + 4 = 10", "x = 4"), false);
});

test("recognizes infinite-solution natural language", () => {
  assert.equal(canonicalSpecialAnswer("Both sides are equal"), "infinite-solutions");
  assert.equal(canonicalSpecialAnswer("The two sides cancel out"), "infinite-solutions");
  assert.equal(mathAnswersEquivalent("Both sides cancel out", "infinitely many solutions"), true);
});

test("recognizes no-solution language", () => {
  assert.equal(mathAnswersEquivalent("no solution", "no solutions"), true);
});

test("recognizes identity and contradiction equations", () => {
  assert.equal(equationsEquivalent("2(x + 3) = 2x + 6", "5x - 4 = 5x - 4"), true);
  assert.equal(equationsEquivalent("2x + 1 = 2x + 3", "4x = 4x + 8"), true);
  assert.equal(equationsEquivalent("2x + 1 = 2x + 3", "x = 3"), false);
});
