import test from "node:test";
import assert from "node:assert/strict";
import {
  PRACTICE_DIFFICULTIES,
  PRACTICE_SKILLS,
  calculatePracticeSummary,
  generatePracticeSession,
  gradePracticeAnswer,
  validatePracticeOptions
} from "../public/practice-core.mjs";

function seededRandom(seed = 123456) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test("practice options reject unsupported skills, difficulties, and lengths", () => {
  assert.equal(
    validatePracticeOptions({ skill: "A.2A", difficulty: "easy", count: 7 })
      .errors.length,
    3
  );
  assert.deepEqual(
    validatePracticeOptions({
      skill: "a.5b",
      difficulty: "GRADE-LEVEL",
      count: "10"
    }),
    {
      errors: [],
      options: { skill: "A.5B", difficulty: "grade-level", count: 10 }
    }
  );
});

test("every live skill generates valid answerable sessions at every difficulty", () => {
  let seed = 100;

  for (const skill of Object.keys(PRACTICE_SKILLS)) {
    for (const difficulty of PRACTICE_DIFFICULTIES) {
      const session = generatePracticeSession(
        { skill, difficulty, count: 20 },
        seededRandom(seed++)
      );

      assert.equal(session.items.length, 20);
      assert.equal(new Set(session.items.map(item => item.id)).size, 20);
      assert.ok(session.items.every(item => item.skill === skill));
      assert.ok(session.items.every(item => item.prompt.length > 0));
      assert.ok(session.items.every(item => item.solution_steps.length >= 2));
      assert.ok(
        session.items.every(item => gradePracticeAnswer(item.answer_key, item)),
        `${skill} ${difficulty} should accept every generated answer key`
      );
    }
  }
});

test("A.5A accepts equation values and identity or contradiction language", () => {
  const session = generatePracticeSession(
    { skill: "A.5A", difficulty: "challenging", count: 5 },
    seededRandom(9)
  );
  const identity = session.items.find(item => item.variant === "identity");
  const contradiction = session.items.find(item => item.variant === "contradiction");
  const numeric = session.items.find(item => item.answer_key.startsWith("x ="));

  assert.ok(identity);
  assert.ok(contradiction);
  assert.ok(numeric);
  assert.equal(gradePracticeAnswer("the two sides cancel out", identity), false);
  assert.equal(gradePracticeAnswer("all real numbers", identity), true);
  assert.equal(gradePracticeAnswer("empty set", contradiction), true);
  assert.equal(
    gradePracticeAnswer(numeric.answer_key.replace("x =", "x is"), numeric),
    true
  );
});

test("A.5B accepts equivalent inequality orientation and Unicode symbols", () => {
  const item = generatePracticeSession(
    { skill: "A.5B", difficulty: "foundational", count: 5 },
    seededRandom(25)
  ).items[0];
  const { operator, boundary } = item.expected;
  const reverse = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" }[
    operator
  ];

  assert.equal(
    gradePracticeAnswer(`${boundary} ${reverse} x`, item),
    true
  );
  assert.equal(
    gradePracticeAnswer(
      `x ${operator.replace("<=", "≤").replace(">=", "≥")} ${boundary}`,
      item
    ),
    true
  );
  assert.equal(
    gradePracticeAnswer(`x ${reverse} ${boundary}`, item),
    false
  );
});

test("A.5C accepts coordinate and labeled-pair answers", () => {
  const item = generatePracticeSession(
    { skill: "A.5C", difficulty: "challenging", count: 5 },
    seededRandom(80)
  ).items[0];
  const { x, y } = item.expected;

  assert.equal(gradePracticeAnswer(`(${x}, ${y})`, item), true);
  assert.equal(gradePracticeAnswer(`y=${y}, x=${x}`, item), true);
  assert.equal(gradePracticeAnswer(`(${y}, ${x})`, item), x === y);
});

test("A.10E accepts equivalent factor order and rejects incorrect signs", () => {
  const item = generatePracticeSession(
    { skill: "A.10E", difficulty: "grade-level", count: 5 },
    seededRandom(44)
  ).items[1];
  const match = item.answer_key.match(/^(\([^)]*\))(\([^)]*\))$/);

  assert.ok(match);
  assert.equal(gradePracticeAnswer(item.answer_key, item), true);
  assert.equal(gradePracticeAnswer(`${match[2]}${match[1]}`, item), true);
  assert.equal(gradePracticeAnswer("(x + 1)(x + 1)", item), false);
});

test("A.10F generates and grades conjugate difference-of-squares factors", () => {
  for (const difficulty of PRACTICE_DIFFICULTIES) {
    const item = generatePracticeSession(
      { skill: "A.10F", difficulty, count: 5 },
      seededRandom(71)
    ).items[0];

    assert.equal(item.expected.b, 0);
    assert.ok(item.expected.c < 0);
    assert.equal(gradePracticeAnswer(item.answer_key, item), true);
  }
});

test("A.10F accepts a complete factorization with an outside GCF", () => {
  const item = {
    answer_type: "factored-quadratic",
    expected: { a: 4, b: 0, c: -16 }
  };

  assert.equal(gradePracticeAnswer("4(x-2)(x+2)", item), true);
  assert.equal(gradePracticeAnswer("4(x+2)(x-2)", item), true);
  assert.equal(gradePracticeAnswer("4 · (x − 2)(x + 2)", item), true);
  assert.equal(gradePracticeAnswer("(2x-4)(2x+4)", item), false);
  assert.equal(gradePracticeAnswer("4(x-2)(x-2)", item), false);
});

test("A.10F explanations never tell students to multiply by one", () => {
  const session = generatePracticeSession(
    { skill: "A.10F", difficulty: "grade-level", count: 20 },
    seededRandom(91)
  );

  assert.ok(
    session.items.every(item =>
      item.alternate_explanation_steps.every(
        step => !step.toLowerCase().includes("multiply by 1")
      )
    )
  );
});

test("practice summary uses first attempts and identifies review items", () => {
  const session = generatePracticeSession(
    { skill: "A.5A", difficulty: "foundational", count: 5 },
    seededRandom(5)
  );
  const records = session.items.map((item, index) => ({
    item_id: item.id,
    first_attempt_correct: index < 4,
    attempt_count: index < 4 ? 1 : 2,
    hint_count: 0,
    first_error_tag: index < 4 ? null : item.diagnostic_tag
  }));
  const summary = calculatePracticeSummary(records, session.items);

  assert.equal(summary.firstAttemptCorrect, 4);
  assert.equal(summary.scorePercent, 80);
  assert.equal(summary.label, "Mastered");
  assert.deepEqual(summary.missedItems.map(item => item.id), [session.items[4].id]);
});
