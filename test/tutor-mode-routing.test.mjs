import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const lesson = await readFile(
  new URL("../public/lesson.js", import.meta.url),
  "utf8"
);

test("lesson pages default to instruction instead of forcing the diagnostic", () => {
  assert.match(lesson, /const requestedStart = lessonParams\.get\("start"\) \|\| "lesson"/);
  assert.match(lesson, /const lessonStartIndex = findStageIndex\("concept"\)/);
  assert.match(lesson, /requestedStart === "diagnostic"[\s\S]*?\? 0[\s\S]*?: Math\.max\(0, lessonStartIndex\)/);
});
