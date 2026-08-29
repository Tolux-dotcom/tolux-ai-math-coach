import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLessonProgressRow,
  normalizeLessonProgressReport
} from "../lesson-progress.mjs";

const validReport = {
  completion_id: "97f36c84-0df0-4a41-8b42-f7dd26c7282b",
  module_id: "alg1-a5a-linear-equations",
  completed_at: "2026-08-29T12:00:00.000Z",
  mastery_label: "Mastered",
  mastery_score: 100,
  time_on_skill_seconds: 742,
  item_records: [
    {
      item_id: "a5a-diag-01",
      attempt_count: 1,
      first_attempt_correct: true,
      hint_count: 1,
      first_error_tag: null
    }
  ]
};

test("normalizes a bounded lesson completion report", () => {
  const normalized = normalizeLessonProgressReport(
    validReport,
    new Date("2026-08-29T12:05:00.000Z")
  );

  assert.equal(normalized.client_completion_id, validReport.completion_id);
  assert.equal(normalized.mastery_score, 100);
  assert.deepEqual(normalized.item_records, validReport.item_records);
});

test("rejects malformed or future completion reports", () => {
  assert.throws(
    () => normalizeLessonProgressReport(
      { ...validReport, mastery_score: 101 },
      new Date("2026-08-29T12:05:00.000Z")
    ),
    /mastery_score/
  );

  assert.throws(
    () => normalizeLessonProgressReport(
      { ...validReport, completed_at: "2026-08-29T12:20:00.000Z" },
      new Date("2026-08-29T12:05:00.000Z")
    ),
    /completed_at/
  );
});

test("server derives account and QA fields instead of trusting the client", () => {
  const report = normalizeLessonProgressReport(
    validReport,
    new Date("2026-08-29T12:05:00.000Z")
  );
  const row = buildLessonProgressRow(
    "cefac2b0-5c7c-46ca-bc63-58900aacb001",
    report,
    { isSubscriber: false, qaMode: true }
  );

  assert.equal(row.user_id, "cefac2b0-5c7c-46ca-bc63-58900aacb001");
  assert.equal(row.qa_mode, true);
  assert.equal(row.is_subscriber, false);
});
