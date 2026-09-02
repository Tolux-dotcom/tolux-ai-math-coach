import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles, practice, practiceHtml] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../public/practice.js", import.meta.url), "utf8"),
  readFile(new URL("../public/practice.html", import.meta.url), "utf8")
]);

test("dashboard exposes a real Practice launcher and does not imply Test Prep is live", () => {
  assert.match(html, /id="practiceModePanel"/);
  assert.match(html, /id="practiceSkillSelect"/);
  assert.match(html, /id="practiceDifficultySelect"/);
  assert.match(html, /id="practiceCountSelect"/);
  assert.match(html, /id="startPracticeBtn"/);
  assert.match(
    html,
    /data-mode="Test Prep"[^>]*disabled[^>]*aria-disabled="true"/
  );
  assert.match(html, /Coming soon/);
});

test("Tutor Mode is a lesson library and keeps readiness diagnostic separate", () => {
  assert.match(html, /id="tutorModePanel"/);
  assert.match(html, /id="tutorSkillSelect"/);
  assert.match(html, /id="startTutorLessonBtn"[^>]*>Start Step-by-Step Lesson/);
  assert.match(html, /id="startReadinessDiagnosticBtn"[^>]*>Take Readiness Diagnostic/);
  assert.match(app, /Learn → Watch Tolux solve → Guided practice → Independent practice → Mastery check/);
  assert.match(app, /module\.available_modes\?\.includes\("lesson"\)/);
  assert.match(app, /openTutorRoute\(selectedTutorModule\(\), "lesson"\)/);
  assert.match(app, /openTutorRoute\(selectedTutorModule\(\), "diagnostic"\)/);
  assert.doesNotMatch(html, /id="startA5ALessonBtn"/);
});

test("Tutor lessons skip the optional diagnostic while diagnostic links begin there", () => {
  assert.match(app, /new URLSearchParams\(\{ module, start \}\)/);
  assert.match(app, /openTutorRoute\("alg1-a5a-linear-equations", "diagnostic"\)/);
  assert.match(app, /coachPanel\.style\.display = shouldShowLesson \|\| shouldShowPractice/);
});

test("Practice launcher is catalog-driven and navigates with explicit settings", () => {
  assert.match(app, /fetch\("\/algebra1-course\.json"\)/);
  assert.match(app, /module\.available_modes\?\.includes\("practice"\)/);
  assert.match(app, /\$\{modules\.length\} completed Algebra 1 skills/);
  assert.doesNotMatch(app, /3 live skills/);
  assert.match(app, /new URLSearchParams\(\{ skill, difficulty, count \}\)/);
  assert.match(app, /window\.location\.href = `\/practice\.html\?\$\{params\.toString\(\)\}`/);
});

test("Practice loads structured lesson banks for completed skills", () => {
  assert.match(practice, /PRACTICE_SKILLS/);
  assert.match(practice, /fetch\(config\.lessonPath\)/);
  assert.match(practice, /generateStructuredPracticeSession/);
});

test("Explain Another Way renders worked teaching and links to Tutor Mode", () => {
  assert.match(practice, /function teachingExplanationMarkup\(item\)/);
  assert.match(practice, /teaching\.steps/);
  assert.match(practice, /Check the answer/);
  assert.match(practice, /Words to know/);
  assert.match(practice, /Open the full.*Tutor lesson/);
  assert.match(practice, /lesson\.html\?module=/);
  assert.doesNotMatch(
    practice,
    /<strong>Another way to think about it<\/strong>[\s\S]*?<p>\$\{escapeHtml\(item\.alternate_explanation\)\}<\/p>/
  );
});

test("Practice launcher and session collapse to one column on small screens", () => {
  assert.match(
    styles,
    /@media \(max-width: 820px\)[\s\S]*?\.practice-launch-grid \{[\s\S]*?grid-template-columns: 1fr;/
  );
  assert.match(
    styles,
    /@media \(max-width: 820px\)[\s\S]*?\.practice-workspace \{[\s\S]*?grid-template-columns: 1fr;/
  );
});

test("Practice uses the shared timed-trial heartbeat", () => {
  assert.match(practice, /fetchWithPracticeSession\(\s*"\/api\/trial-heartbeat"/);
  assert.match(practice, /activeSeconds:\s*15/);
  assert.match(practice, /window\.setInterval\(sendPracticeTrialHeartbeat, 15000\)/);
  assert.doesNotMatch(practice, /10 free learning interactions/);
  assert.match(practiceHtml, /free trial measures active learning time/i);
  assert.doesNotMatch(practiceHtml, /Each question counts once/i);
});
