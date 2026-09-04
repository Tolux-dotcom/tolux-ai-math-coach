import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const splitUi = fs.readFileSync(new URL("../public/algebra1-split-ui.js", import.meta.url), "utf8");
const dashboardBridge = fs.readFileSync(new URL("../public/a10f-dashboard-bridge.js", import.meta.url), "utf8");

test("dashboard reuses the second course slot as Algebra 1B", () => {
  assert.match(splitUi, /Algebra 1A/);
  assert.match(splitUi, /Algebra 1B/);
  assert.match(splitUi, /Modules 1–27/);
  assert.match(splitUi, /Modules 28–49/);
  assert.match(splitUi, /PART_A_LIMIT = 27/);
  assert.match(splitUi, /PART_B_START = 28/);
  assert.match(splitUi, /TOTAL_MODULES = 49/);
  assert.doesNotMatch(splitUi, /Algebra 2/);
});

test("split preserves original module ids and derives stable module numbers from catalog order", () => {
  assert.match(splitUi, /fetch\("\/algebra1-course\.json"\)/);
  assert.match(splitUi, /moduleNumbersById/);
  assert.match(splitUi, /moduleNumbersByTeks/);
  assert.match(splitUi, /moduleNumber: index \+ 1/);
  assert.match(splitUi, /activeModules\(\)/);
});

test("Tutor and Practice lists render every module in numerical order and mark unfinished work", () => {
  assert.match(splitUi, /select\.replaceChildren\(\.\.\.options\)/);
  assert.match(splitUi, /Module \$\{module\.moduleNumber\}/);
  assert.match(splitUi, /Coming soon/);
  assert.match(splitUi, /option\.disabled = !live/);
  assert.match(splitUi, /toluxPlaceholder/);
});

test("split keeps one Algebra 1 course identity and overall 49-module progress", () => {
  assert.match(splitUi, /partA\.dataset\.course = "Algebra 1"/);
  assert.match(splitUi, /partB\.dataset\.course = "Algebra 1"/);
  assert.match(splitUi, /49 of 49 Algebra 1 TEKS mapped overall/);
  assert.match(splitUi, /localStorage\.setItem\(STORAGE_KEY, activePart\)/);
});

test("dashboard loads split UI without a broad DOM observer", () => {
  assert.match(dashboardBridge, /algebra1-split-ui\.js/);
  assert.match(dashboardBridge, /data-tolux-algebra1-split/);
  assert.doesNotMatch(splitUi, /MutationObserver/);
  assert.match(splitUi, /attempts >= 50/);
});
