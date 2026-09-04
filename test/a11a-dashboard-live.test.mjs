import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bridge = fs.readFileSync(new URL("../public/a11a-dashboard-bridge.js", import.meta.url), "utf8");

test("approved A.11A upgrades a Coming soon placeholder into a live option", () => {
  assert.match(bridge, /existing\.disabled = false/);
  assert.match(bridge, /delete existing\.dataset\.toluxPlaceholder/);
  assert.match(bridge, /existing\.textContent = label/);
});
