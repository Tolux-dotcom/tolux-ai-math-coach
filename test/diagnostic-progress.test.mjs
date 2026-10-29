import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLessonProgressReport } from "../lesson-progress.mjs";
import {
  buildDiagnosticProgressReport,
  diagnosticProgressModuleId,
  persistDiagnosticProgress,
  summarizeDiagnosticReadiness
} from "../public/diagnostic-progress.mjs";

const items = [
  { id: "A5A-D01", diagnostic_tag: "distribution" },
  { id: "A5A-D02", diagnostic_tag: "combine_like_terms" }
];
const records = [
  {
    item_id: "A5A-D01",
    attempt_count: 2,
    first_attempt_correct: false,
    hint_count: 0,
    first_error_tag: "distribution"
  },
  {
    item_id: "A5A-D02",
    attempt_count: 1,
    first_attempt_correct: true,
    hint_count: 0,
    first_error_tag: null
  }
];

test("diagnostic summary uses first attempts and identifies the exact prerequisite gap", () => {
  const summary = summarizeDiagnosticReadiness(items, records);
  assert.equal(summary.correctCount, 1);
  assert.equal(summary.total, 2);
  assert.equal(summary.scorePercent, 50);
  assert.equal(summary.readinessLabel, "Review recommended");
  assert.deepEqual(summary.missedItems.map(item => item.id), ["A5A-D01"]);
});

test("signed-in diagnostic report is accepted by the existing progress contract", () => {
  const report = buildDiagnosticProgressReport({
    moduleId: "alg1-a5a-linear-equations",
    items,
    itemRecords: records,
    ownerId: "cefac2b0-5c7c-46ca-bc63-58900aacb001",
    completionId: "97f36c84-0df0-4a41-8b42-f7dd26c7282b",
    completedAt: "2026-10-29T12:00:00.000Z",
    timeOnSkillSeconds: 74
  });

  assert.equal(report.module_id, diagnosticProgressModuleId("alg1-a5a-linear-equations"));
  assert.equal(report.mastery_score, 50);
  assert.equal(report.mastery_label, "Developing");
  assert.equal(report.item_records.length, 2);
  assert.equal(
    normalizeLessonProgressReport(report, new Date("2026-10-29T12:01:00.000Z"))
      .client_completion_id,
    report.completion_id
  );
});

test("signed-out diagnostic remains device-only and cannot be queued into a later account", async () => {
  const data = new Map();
  let ownedCalls = 0;
  const report = buildDiagnosticProgressReport({
    moduleId: "alg1-a5a-linear-equations",
    items,
    itemRecords: records,
    ownerId: null,
    completionId: "97f36c84-0df0-4a41-8b42-f7dd26c7282b",
    completedAt: "2026-10-29T12:00:00.000Z"
  });
  const result = await persistDiagnosticProgress({
    report,
    persistOwned: async () => { ownedCalls += 1; },
    storage: {
      setItem(key, value) { data.set(key, String(value)); }
    }
  });

  assert.equal(result.deviceOnly, true);
  assert.equal(ownedCalls, 0);
  assert.equal(data.has(`toluxLessonProgress:${report.module_id}`), true);
  assert.equal(
    [...data.keys()].some(key => key.startsWith("toluxPendingLessonProgress:")),
    false
  );
});

test("signed-in diagnostic delegates to owner-safe account persistence", async () => {
  let delegated = 0;
  const report = { owner_user_id: "student-a", module_id: "diagnostic-module" };
  const result = await persistDiagnosticProgress({
    report,
    persistOwned: async () => {
      delegated += 1;
      return { synced: true, activity: { module_id: report.module_id } };
    },
    storage: { setItem() { throw new Error("must not write the unowned path"); } }
  });

  assert.equal(delegated, 1);
  assert.equal(result.synced, true);
});
