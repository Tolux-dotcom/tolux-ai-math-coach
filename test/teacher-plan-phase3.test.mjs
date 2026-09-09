import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const teacherHtml = fs.readFileSync("public/teacher.html", "utf8");
const phase3 = fs.readFileSync("public/teacher-phase3.js", "utf8");
const migration = fs.readFileSync("supabase/migrations/202609080007_create_teacher_plan_phase3_pilot_requests.sql", "utf8");

test("Phase 3 adds intervention groups and parent summaries without guardian contact storage", () => {
  assert.match(teacherHtml, /Intervention groups & parent updates/);
  assert.match(teacherHtml, /parentSummary/);
  assert.match(phase3, /Intervention Needed/);
  assert.match(phase3, /Developing/);
  assert.match(phase3, /not a report-card grade/);
  assert.doesNotMatch(migration, /parent_email|guardian_email|guardian_phone/i);
});

test("school pilot requests are authenticated and owner-scoped", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /\(select auth\.uid\(\)\) = requester_user_id/);
  assert.match(migration, /auth\.jwt\(\)->>'email'/);
  assert.match(migration, /is_anonymous/);
  assert.match(migration, /status = 'requested'/);
  assert.match(phase3, /school_pilot_requests/);
});

test("intervention groups are derived from verified classroom report results", () => {
  assert.match(phase3, /get_teacher_classroom_report/);
  assert.match(phase3, /latestCompletion/);
  assert.match(phase3, /mastery_label === "Intervention Needed"/);
  assert.match(phase3, /mastery_label === "Developing"/);
  assert.match(teacherHtml, /They are not AI guesses/);
});
