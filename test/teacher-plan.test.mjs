import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/teacher.html", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../public/teacher.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/202609080001_create_teacher_plan_mvp.sql", import.meta.url), "utf8");

test("teacher plan exposes free classroom assignment workflow", () => {
  assert.match(html, /FREE TEACHER PLAN/);
  assert.match(html, /Create student launch link/);
  assert.match(js, /teacher_classrooms/);
  assert.match(js, /teacher_assignments/);
  assert.match(js, /practice\.html/);
  assert.match(js, /lesson\.html/);
});

test("teacher data is protected by owner-scoped RLS", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\)\) = teacher_user_id/);
  assert.match(migration, /auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(migration, /using \(true\)/i);
});
