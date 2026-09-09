import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const edge = fs.readFileSync("supabase/functions/teacher-classroom/index.ts", "utf8");
const bridge = fs.readFileSync("public/classroom-entitlement-bridge.js", "utf8");
const lessonHtml = fs.readFileSync("public/lesson.html", "utf8");
const practiceHtml = fs.readFileSync("public/practice.html", "utf8");
const assignmentHtml = fs.readFileSync("public/assignment.html", "utf8");

test("classroom entitlement requires an authenticated enrolled student and published assignment", () => {
  assert.match(edge, /assignment-entitlement/);
  assert.match(edge, /eq\("status", "published"\)/);
  assert.match(edge, /student_user_id", user\.id/);
  assert.match(edge, /not-enrolled/);
  assert.match(edge, /classroom\.archived/);
});

test("entitlement is locked to the teacher's exact lesson or practice launch URL", () => {
  assert.match(edge, /canonicalActivityPath/);
  assert.match(edge, /activityMatchesAssignment/);
  assert.match(edge, /url\.searchParams\.delete\("assignment"\)/);
  assert.match(edge, /new Set\(\["module", "start", "assignment"\]\)/);
  assert.match(edge, /new Set\(\["skill", "difficulty", "count", "assignment"\]\)/);
  assert.match(edge, /expected === actual/);
});

test("only lesson/practice trial-meter requests are bypassed for a verified assignment", () => {
  assert.match(bridge, /\/api\/lesson-usage/);
  assert.match(bridge, /\/api\/trial-heartbeat/);
  assert.match(bridge, /\/api\/lesson-trial-heartbeat/);
  assert.doesNotMatch(bridge, /\/api\/coach/);
  assert.match(lessonHtml, /classroom-entitlement-bridge\.js/);
  assert.match(practiceHtml, /classroom-entitlement-bridge\.js/);
});

test("students are told assigned work does not consume personal trial time", () => {
  assert.match(assignmentHtml, /Teacher-assigned work is included at no charge/);
  assert.match(assignmentHtml, /will not use your personal Tolux free-trial time/);
  assert.match(assignmentHtml, /Extra tutoring or practice outside the assignment follows the regular student plan/);
});
