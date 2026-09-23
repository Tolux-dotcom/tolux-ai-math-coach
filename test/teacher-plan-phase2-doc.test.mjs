import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const doc = fs.readFileSync("docs/TEACHER_PLAN_PHASE2.md", "utf8");

test("Teacher Plan Phase 2 remains review-gated", () => {
  assert.match(doc, /Keep this branch unmerged until owner review/);
  assert.match(doc, /JWT-protected `teacher-classroom` Supabase Edge Function/);
  assert.match(doc, /SECURITY INVOKER/);
});
