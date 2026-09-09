import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const phase2Schema = fs.readFileSync("supabase/migrations/202609080002_create_teacher_plan_phase2.sql", "utf8");
const rpcRemoval = fs.readFileSync("supabase/migrations/202609080004_remove_teacher_plan_phase2_exposed_rpcs.sql", "utf8");
const reportMigration = fs.readFileSync("supabase/migrations/202609080005_add_teacher_report_rls_and_invoker.sql", "utf8");
const edge = fs.readFileSync("supabase/functions/teacher-classroom/index.ts", "utf8");
const assignment = fs.readFileSync("public/assignment.js", "utf8");
const attribution = fs.readFileSync("public/assignment-attribution.js", "utf8");
const teacher = fs.readFileSync("public/teacher.js", "utf8");

test("class enrollment and assignment results use RLS", () => {
  assert.match(phase2Schema, /alter table public\.class_enrollments enable row level security/);
  assert.match(phase2Schema, /Students can view their own class enrollments/);
  assert.match(phase2Schema, /Students can view their own assignment results/);
  assert.match(reportMigration, /Teachers can view enrollments in their own classrooms/);
  assert.match(reportMigration, /Teachers can view assignment results in their own classrooms/);
});

test("sensitive student actions use a JWT-checked Edge Function", () => {
  assert.match(edge, /admin\.auth\.getUser\(token\)/);
  assert.match(edge, /teacher_user_id", user\.id/);
  assert.match(edge, /student_user_id", user\.id/);
  assert.match(edge, /Completion does not match assignment/);
  assert.match(edge, /Student is not enrolled in this class/);
  assert.match(assignment, /functions\.invoke\("teacher-classroom"/);
  assert.match(attribution, /functions\.invoke\("teacher-classroom"/);
});

test("exposed elevated RPCs are removed and teacher report is invoker-scoped", () => {
  assert.match(rpcRemoval, /drop function if exists public\.join_teacher_class/);
  assert.match(rpcRemoval, /drop function if exists public\.record_assignment_completion/);
  assert.match(reportMigration, /security invoker/);
  assert.doesNotMatch(reportMigration, /security definer/i);
});

test("teachers share secure assignment gateway links and see mastery reports", () => {
  assert.match(teacher, /assignment\.html\?id=/);
  assert.match(teacher, /get_teacher_classroom_report/);
  assert.match(teacher, /Intervention Needed/);
  assert.match(teacher, /Average mastery/);
});
