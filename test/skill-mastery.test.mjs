import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSkillAttemptRow,
  mergeSkillMastery,
  skillCodeForModule
} from "../skill-mastery.mjs";

const report = {
  client_completion_id: "97f36c84-0df0-4a41-8b42-f7dd26c7282b",
  module_id: "practice-alg1-a10e-factor-trinomials",
  completed_at: "2026-08-31T15:00:00.000Z",
  mastery_label: "Developing",
  mastery_score: 60,
  time_on_skill_seconds: 240,
  item_records: [
    { item_id: "a10e-1", first_error_tag: "signed_factor_pair" },
    { item_id: "a10e-2", first_error_tag: "signed_factor_pair" },
    { item_id: "a10e-3", first_error_tag: null }
  ]
};

test("maps only supported lesson and practice modules to skill codes", () => {
  assert.equal(skillCodeForModule(report.module_id), "A.10E");
  assert.equal(skillCodeForModule("practice-alg1-a10f-difference-of-squares"), "A.10F");
  assert.equal(skillCodeForModule("unknown-module"), null);
});

test("builds a server-owned skill attempt from a completion report", () => {
  const attempt = buildSkillAttemptRow(
    "cefac2b0-5c7c-46ca-bc63-58900aacb001",
    report
  );

  assert.equal(attempt.skill_code, "A.10E");
  assert.equal(attempt.mastery_score, 60);
  assert.equal(attempt.qa_mode, false);
});

test("aggregates latest, best, time, attempts, and misconception counts", () => {
  const attempt = buildSkillAttemptRow(
    "cefac2b0-5c7c-46ca-bc63-58900aacb001",
    report
  );
  const mastery = mergeSkillMastery({
    attempts_count: 2,
    latest_score: 80,
    best_score: 80,
    total_time_on_skill_seconds: 300,
    misconception_counts: { factor_pair: 1 }
  }, attempt);

  assert.equal(mastery.attempts_count, 3);
  assert.equal(mastery.latest_score, 60);
  assert.equal(mastery.best_score, 80);
  assert.equal(mastery.total_time_on_skill_seconds, 540);
  assert.deepEqual(mastery.misconception_counts, {
    factor_pair: 1,
    signed_factor_pair: 2
  });
});
