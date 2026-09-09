import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/202609080003_add_teacher_plan_phase2_rpcs.sql", "utf8");
const assignment = fs.readFileSync("public/assignment.js", "utf8");
const attribution = fs.readFileSync("public/assignment-attribution.js", "utf8");
const teacher = fs.readFileSync("public/teacher.js", "utf8");

test("class joins and reports are authenticated and ownership-scoped", () => {
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /teacher_user_id = v_uid/);
  assert.match(migration, /student_user_id = v_uid/);
  assert.match(migration, /revoke all on function public\.join_teacher_class/);
  assert.match(migration, /grant execute on function public\.get_teacher_classroom_report/);
});

test("assignment completion attribution verifies enrollment and matching module", () => {
  assert.match(migration, /Student is not enrolled in this class/);
  assert.match(migration, /Completion does not match assignment/);
  assert.match(migration, /client_completion_id = p_client_completion_id/);
  assert.match(attribution, /record_assignment_completion/);
});

test("students use secure assignment gateway and teachers share gateway links", () => {
  assert.match(assignment, /join_teacher_class/);
  assert.match(assignment, /get_assignment_for_student/);
  assert.match(teacher, /assignment\.html\?id=/);
  assert.match(teacher, /get_teacher_classroom_report/);
  assert.doesNotMatch(teacher, /Copy link<\/button>/);
});
