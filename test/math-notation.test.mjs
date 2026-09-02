import test from "node:test";
import assert from "node:assert/strict";

import { formatMathNotation } from "../public/lesson-core.mjs";

test("student-facing powers use standard superscript notation", () => {
  assert.equal(formatMathNotation("x^2 + x^3"), "x² + x³");
  assert.equal(formatMathNotation("(b/2)^2"), "(b/2)²");
  assert.equal(formatMathNotation("10^-2"), "10⁻²");
});

test("notation formatting leaves non-exponent text unchanged", () => {
  assert.equal(formatMathNotation("x = 2 or x = -2"), "x = 2 or x = -2");
});
