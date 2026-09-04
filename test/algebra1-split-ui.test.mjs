import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const splitUi = fs.readFileSync(new URL("../public/algebra1-split-ui.js", import.meta.url), "utf8");
const dashboardBridge = fs.readFileSync(new URL("../public/a10f-dashboard-bridge.js", import.meta.url), "utf8");

test("dashboard reuses the second course slot as Algebra 1B", () => {
  assert.match(splitUi, /Algebra 1A/);
  assert.match(splitUi, /Algebra 1B/);
  assert.match(splitUi, /Modules 1–26/);
  assert.match(splitUi, /Modules 27–49/);
  assert.match(splitUi, /PART_A_LIMIT = 26/);
  assert.match(splitUi, /TOTAL_MODULES = 49/);
  assert.doesNotMatch(splitUi, /Algebra 2/);
});

test("split preserves original module ids and derives section membership from catalog order", () => {
  assert.match(splitUi, /fetch\("\/algebra1-course\.json"\)/);
  assert.match(splitUi, /moduleNumbersById/);
  assert.match(splitUi, /moduleNumbersByTeks/);
  assert.match(splitUi, /index \+ 1/);
  assert.match(splitUi, /option\.hidden = !show/);
  assert.match(splitUi, /option\.disabled = !show/);
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
