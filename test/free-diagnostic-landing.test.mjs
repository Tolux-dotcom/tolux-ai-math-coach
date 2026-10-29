import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../public/free-algebra-readiness-test.html", import.meta.url),
  "utf8"
);

test("both public readiness calls to action open the actual free diagnostic", () => {
  const route = "/lesson.html?module=alg1-a5a-linear-equations&amp;start=diagnostic";
  assert.equal(page.split(`href="${route}"`).length - 1, 2);
});
