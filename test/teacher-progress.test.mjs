import test from "node:test";
import assert from "node:assert/strict";
import { buildTeacherProgressSummary } from "../teacher-progress.mjs";

const catalog = {
  units: [{
    title: "Solving Equations",
    modules: [{
      module_id: "alg1-a5a-linear-equations",
      title: "Solving Linear Equations",
      teks: ["A.5A"]
    }]
  }]
};

test("summarizes TEKS mastery from latest module activity", () => {
  const summary = buildTeacherProgressSummary([
    {
      module_id: "alg1-a5a-linear-equations",
      completed_at: "2026-10-01T10:00:00.000Z",
      mastery_label: "Developing",
      mastery_score: 65,
      time_on_skill_seconds: 300,
      item_records: []
    },
    {
      module_id: "alg1-a5a-linear-equations",
      completed_at: "2026-10-02T10:00:00.000Z",
      mastery_label: "Mastered",
      mastery_score: 90,
      time_on_skill_seconds: 480,
      item_records: [
        { attempt_count: 1, hint_count: 0, first_attempt_correct: true, first_error_tag: null },
        { attempt_count: 2, hint_count: 1, first_attempt_correct: false, first_error_tag: "sign-error" }
      ]
    }
  ], catalog);

  assert.equal(summary.completedModules, 1);
  assert.equal(summary.mastered, 1);
  assert.equal(summary.standards[0].teks[0], "A.5A");
  assert.equal(summary.standards[0].masteryScore, 90);
  assert.equal(summary.standards[0].firstAttemptRate, 50);
  assert.equal(summary.topMisconceptions[0].tag, "sign-error");
});

test("handles unmapped modules without inventing TEKS", () => {
  const summary = buildTeacherProgressSummary([{
    module_id: "practice-custom",
    completed_at: "2026-10-02T10:00:00.000Z",
    mastery_label: "Intervention Needed",
    mastery_score: 40,
    time_on_skill_seconds: 120,
    item_records: []
  }], catalog);

  assert.deepEqual(summary.standards[0].teks, []);
  assert.equal(summary.intervention, 1);
});
