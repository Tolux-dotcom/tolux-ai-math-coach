import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const a11a = fs.readFileSync(new URL("../public/a11a-dashboard-bridge.js", import.meta.url), "utf8");
const a11b = fs.readFileSync(new URL("../public/a11b-dashboard-bridge.js", import.meta.url), "utf8");

for (const [name, bridge] of [["A.11A", a11a], ["A.11B", a11b]]) {
  test(`${name} promotes an existing Coming soon placeholder into a live option`, () => {
    assert.match(bridge, /existing\.disabled = false/);
    assert.match(bridge, /delete existing\.dataset\.toluxPlaceholder/);
    assert.match(bridge, /existing\.textContent = label/);
  });
}
