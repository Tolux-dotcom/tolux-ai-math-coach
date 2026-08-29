import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, server] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../server.mjs", import.meta.url), "utf8")
]);

test("revenue funnel exposes diagnostic, membership, cohort, and school paths", () => {
  assert.match(html, /Start Free Diagnostic/);
  assert.match(html, /Student Plan/);
  assert.match(html, /Family Plan/);
  assert.match(html, /Guided Algebra Mastery Program/);
  assert.match(html, /Educators & Schools/);
  assert.match(html, /Request a Pilot/);
});

test("checkout uses authenticated server-controlled Tolux plans", () => {
  assert.match(app, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(app, /startCheckout\("student"\)/);
  assert.match(app, /startCheckout\("family"\)/);
  assert.doesNotMatch(app, /startCheckout\("price_/);
  assert.match(server, /const STRIPE_PLAN_PRICE_IDS/);
  assert.match(server, /const user = await getAuthenticatedUser\(req\)/);
  assert.match(server, /client_reference_id: user\.id/);
  assert.match(server, /subscription_data:/);
});

test("payment lifecycle updates access and protects session verification", () => {
  assert.match(server, /setStudentSubscription\(userId, true\)/);
  assert.match(server, /setStudentSubscription\(userId, false\)/);
  assert.match(server, /session\.client_reference_id !== user\.id/);
  assert.doesNotMatch(server, /customerEmail: session\.customer_details/);
});
