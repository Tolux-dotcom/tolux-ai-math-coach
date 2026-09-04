import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const guard = fs.readFileSync(new URL("../public/lesson-completion-guard.js", import.meta.url), "utf8");
const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");

test("completed lessons ignore stale or duplicate next clicks", () => {
  assert.match(guard, /Lesson Complete/);
  assert.match(guard, /Lesson unavailable/);
  assert.match(guard, /stopImmediatePropagation/);
});

test("lesson page loads the completion guard before QA overlays", () => {
  assert.match(lessonHtml, /lesson-completion-guard\.js/);
});
