import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildLessonProgressRow,
  dedupeLessonProgressActivities,
  mergeLessonProgressActivities,
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
      item_id: "A5A-D01",
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

test("deduplicates repeated completion records without removing distinct attempts", () => {
  const first = {
    client_completion_id: validReport.completion_id,
    module_id: validReport.module_id,
    completed_at: validReport.completed_at,
    mastery_label: validReport.mastery_label,
    mastery_score: validReport.mastery_score
  };
  const repeated = {
    ...first,
    client_completion_id: "cc45d55c-7c3c-4bce-882f-517c0b263394"
  };
  const later = {
    ...first,
    client_completion_id: "a8e243cb-7f5d-4f13-955b-73ac24bda915",
    completed_at: "2026-08-29T12:10:00.000Z"
  };

  assert.deepEqual(
    dedupeLessonProgressActivities([first, repeated, later]),
    [first, later]
  );
});

test("keeps the latest Test Prep result visible beyond the recent activity window", () => {
  const recent = Array.from({ length: 25 }, (_, index) => ({
    client_completion_id: `recent-${index}`,
    module_id: `alg1-module-${index}`,
    completed_at: `2026-10-${String(30 - index).padStart(2, "0")}T12:00:00.000Z`,
    mastery_label: "Mastered",
    mastery_score: 100,
    time_on_skill_seconds: 300
  }));
  const testPrep = {
    client_completion_id: "test-prep-result",
    module_id: "test-prep-quick-check",
    completed_at: "2026-09-01T12:00:00.000Z",
    mastery_label: "Developing",
    mastery_score: 70,
    time_on_skill_seconds: 600
  };

  const merged = mergeLessonProgressActivities(recent, [testPrep]);
  assert.equal(merged.length, 26);
  assert.equal(merged.at(-1).client_completion_id, "test-prep-result");
});

test("account history requests the latest Test Prep result outside the recent 25", () => {
  const server = fs.readFileSync(
    new URL("../server.mjs", import.meta.url),
    "utf8"
  );
  assert.match(server, /\.in\("module_id", TEST_PREP_MODULE_IDS\)/);
  assert.match(server, /mergeLessonProgressActivities\(/);
});
