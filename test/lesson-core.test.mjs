import test from "node:test";
import assert from "node:assert/strict";

import {
  answersEquivalent,
  buildRecheckItems,
  calculateMastery,
  explanationSatisfies,
  keywordGroupsSatisfied,
  normalizeAnswer
} from "../public/lesson-core.mjs";

test("normalizes common student answer notation", () => {
  assert.equal(normalizeAnswer(" Answer is x = −5. "), "x=-5");
  assert.equal(normalizeAnswer("3 * x + 12"), "3x+12");
});

test("accepts equivalent equation, fraction, unit, and special-case answers", () => {
  assert.equal(answersEquivalent("5", { answer_key: "x = 5" }), true);
  assert.equal(answersEquivalent("x = 5.0", { answer_key: "x = 5" }), true);
  assert.equal(answersEquivalent("8.333333333333333", { answer_key: "x = 25/3" }), true);
  assert.equal(answersEquivalent("6", { answer_key: "6 GB" }), true);
  assert.equal(
    answersEquivalent("all real numbers", {
      answer_key: "Infinitely many solutions"
    }),
    true
  );
  assert.equal(answersEquivalent("none", { answer_key: "No solution" }), true);
  assert.equal(answersEquivalent("x = 4", { answer_key: "x = 5" }), false);
});

test("grades explanation-style responses by grouped mathematical ideas", () => {
  const remediationItem = {
    answer_key: "The 3 must multiply both terms.",
    answer_keywords: [
      ["multiply", "distribute"],
      ["both", "every"],
      ["3x + 6"]
    ],
    minimum_keyword_groups: 2
  };

  assert.equal(
    answersEquivalent("Distribute 3 to both terms inside the parentheses.", remediationItem),
    true
  );
  assert.equal(answersEquivalent("The answer is wrong.", remediationItem), false);
  assert.equal(
    keywordGroupsSatisfied("Both sides simplify to the same expression.", [
      ["same", "identical"],
      ["both sides", "each side"]
    ]),
    true
  );
});

test("requires a substantive explanation on the designated mastery item", () => {
  const item = {
    explanation_prompt: "Why?",
    explanation_keywords: [
      ["same", "true statement"],
      ["both sides", "all x"]
    ]
  };

  assert.equal(
    explanationSatisfies("Both sides are the same, so all x values work.", item),
    true
  );
  assert.equal(explanationSatisfies("Because it does.", item), false);
});

test("applies the 80 percent mastery and zero-critical-miss policy", () => {
  const policy = {
    threshold_percent: 80,
    minimum_mastery_items: 5,
    critical_misconceptions_allowed: 0,
    requires_explanation_item: true
  };
  const passing = [
    { correct: true },
    {
      correct: true,
      requiresExplanation: true,
      explanationCorrect: true,
      critical: true
    },
    { correct: true },
    { correct: true },
    { correct: false }
  ];

  assert.deepEqual(calculateMastery(passing, policy), {
    mastered: true,
    label: "Mastered",
    total: 5,
    correctCount: 4,
    scorePercent: 80,
    criticalMisses: 0,
    explanationPassed: true
  });

  const criticalMiss = passing.map((result, index) =>
    index === 1
      ? {
          correct: false,
          requiresExplanation: true,
          explanationCorrect: false,
          critical: true
        }
      : { ...result, correct: true }
  );
  const failed = calculateMastery(criticalMiss, policy);
  assert.equal(failed.mastered, false);
  assert.equal(failed.criticalMisses, 1);
  assert.equal(failed.explanationPassed, false);
});

test("selects near-transfer recheck items from the same misconception route", () => {
  const missed = {
    id: "M1",
    type: "mastery_check",
    diagnostic_tag: "sign_distribution"
  };
  const module = {
    items: [
      missed,
      {
        id: "P1",
        type: "independent_practice",
        diagnostic_tag: "signed_numbers"
      }
    ],
    misconception_routes: {
      sign_distribution: { route: "signed-number-review" },
      signed_numbers: { route: "signed-number-review" }
    }
  };

  const recheck = buildRecheckItems(module, [missed], 2);
  assert.deepEqual(recheck.map(item => item.id), ["P1", "M1"]);
});
