import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const lessonSource = fs.readFileSync(new URL("../public/lesson.js", import.meta.url), "utf8");
const lessonHtml = fs.readFileSync(new URL("../public/lesson.html", import.meta.url), "utf8");
const diagnosticBypassSource = fs.readFileSync(
  new URL("../public/diagnostic-free-access.js", import.meta.url),
  "utf8"
);

test("customer access is governed by the 600-second trial, not a question-count gate", () => {
  assert.match(serverSource, /TRIAL_SECONDS/);
  assert.match(serverSource, /trial_seconds_used/);
  assert.doesNotMatch(serverSource, /questions_used\s*>?=\s*FREE_QUESTION_LIMIT/);
});

test("main question box participates in active-learning trial heartbeats", () => {
  assert.match(appSource, /\/api\/trial-heartbeat/);
  assert.match(appSource, /activeSeconds:\s*15/);
});

test("free diagnostic bypass cannot unlock the AI coach", () => {
  assert.match(diagnosticBypassSource, /\/api\/lesson-usage/);
  assert.doesNotMatch(diagnosticBypassSource, /\/api\/coach/);
  assert.doesNotMatch(diagnosticBypassSource, /\/api\/trial-heartbeat/);
  assert.match(diagnosticBypassSource, /A5A-D01/);
  assert.match(diagnosticBypassSource, /A5A-D02/);
});

test("lesson learning after diagnostic participates in the same timed trial", () => {
  assert.match(lessonSource, /\/api\/trial-heartbeat/);
  assert.match(lessonSource, /currentStageType\s*===\s*"prerequisite_diagnostic"/);
});

test("free diagnostic bypass is loaded before lesson module logic", () => {
  const bypassIndex = lessonHtml.indexOf("/diagnostic-free-access.js");
  const lessonIndex = lessonHtml.indexOf("/lesson.js");
  assert.ok(bypassIndex >= 0, "diagnostic-free-access.js must be loaded");
  assert.ok(lessonIndex > bypassIndex, "diagnostic bypass must load before lesson.js");
});
