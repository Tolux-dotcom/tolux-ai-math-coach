import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  answersEquivalent,
  explanationSatisfies,
  selectStageItems,
  validateLessonModule
} from "../public/lesson-core.mjs";

const moduleUrl = new URL("../public/a5a-linear-equations.json", import.meta.url);
const lessonModule = JSON.parse(await readFile(moduleUrl, "utf8"));

test("A5A curriculum passes structural validation", () => {
  assert.deepEqual(validateLessonModule(lessonModule), []);
  assert.equal(lessonModule.items.length, 27);
  assert.equal(new Set(lessonModule.items.map(item => item.id)).size, 27);
  assert.equal(lessonModule.lesson_flow.length, 7);
});

test("core lesson contains exactly ten assessed items", () => {
  const assessed = [
    ...selectStageItems(lessonModule, "diagnostic"),
    ...selectStageItems(lessonModule, "guided_practice"),
    ...selectStageItems(lessonModule, "independent_practice"),
    ...selectStageItems(lessonModule, "mastery_check")
  ];

  assert.equal(assessed.length, 10);
  assert.equal(
    assessed.length,
    lessonModule.lesson_settings.assessed_items_in_core_lesson
  );
});

test("every worked example visibly reaches its verified answer", () => {
  const workedExamples = lessonModule.items.filter(
    item => item.type === "worked_example"
  );

  assert.equal(workedExamples.length, 3);
  for (const item of workedExamples) {
    assert.ok(item.solution_steps.length >= 4, `${item.id} needs full steps`);
    assert.ok(
      item.solution_steps.some(step => answersEquivalent(step.equation, item)),
      `${item.id} must visibly show ${item.answer_key}`
    );
    assert.match(item.solution_steps.at(-1).equation, /✓$/);
  }
});

test("tricky A5A answer keys remain mathematically correct", () => {
  const byId = new Map(lessonModule.items.map(item => [item.id, item]));

  assert.equal(byId.get("A5A-P08").answer_key, "x = 25/3");
  assert.equal(byId.get("A5A-P10").answer_key, "x = 8");
  assert.equal(byId.get("A5A-M03").answer_key, "x = 2");
  assert.equal(byId.get("A5A-M05").answer_key, "x = -14");
  assert.equal(byId.get("A5A-P11").answer_key, "No solution");
});

test("mastery includes five items and a critical explanation item", () => {
  const mastery = selectStageItems(lessonModule, "mastery_check");
  const explanationItems = mastery.filter(item => item.explanation_prompt);

  assert.equal(mastery.length, 5);
  assert.equal(explanationItems.length, 1);
  assert.equal(explanationItems[0].id, "A5A-M02");
  assert.equal(explanationItems[0].critical_misconception, true);
});

test("identity explanation accepts common student wording from phone QA", () => {
  const item = lessonModule.items.find(({ id }) => id === "A5A-M02");

  assert.equal(answersEquivalent("Infinitely many solutions", item), true);
  assert.equal(
    explanationSatisfies(
      "Because the 2 sides of the equation are equal",
      item
    ),
    true
  );
  assert.equal(
    explanationSatisfies("The two sides cancel out", item),
    true
  );
  assert.equal(
    explanationSatisfies("They cancel out each other", item),
    true
  );
  assert.equal(explanationSatisfies("Infinitely many solutions", item), false);
  assert.equal(explanationSatisfies("The terms cancel", item), false);
});
