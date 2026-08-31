import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles, practice] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../public/practice.js", import.meta.url), "utf8")
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

test("Practice launcher is catalog-driven and navigates with explicit settings", () => {
  assert.match(app, /fetch\("\/algebra1-course\.json"\)/);
  assert.match(app, /module\.available_modes\?\.includes\("practice"\)/);
  assert.match(app, /new URLSearchParams\(\{ skill, difficulty, count \}\)/);
  assert.match(app, /window\.location\.href = `\/practice\.html\?\$\{params\.toString\(\)\}`/);
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
});
