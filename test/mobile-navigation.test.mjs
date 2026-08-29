import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const styles = await readFile(
  new URL("../public/styles.css", import.meta.url),
  "utf8"
);

test("portrait mobile keeps the primary navigation visible and touch friendly", () => {
  assert.doesNotMatch(styles, /\.sidebar nav\{display:none\}/);
  assert.match(
    styles,
    /\.sidebar nav\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/
  );
  assert.match(styles, /\.sidebar \.nav\{min-height:44px/);
});
