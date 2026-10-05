import test from "node:test";
import assert from "node:assert/strict";
import { createDailyFreeAccessController } from "../daily-free-access.mjs";

const env = {
  DAILY_FREE_ALLOWANCE_ENABLED: "true",
  DAILY_FREE_COOKIE_SECRET: "12345678901234567890123456789012",
  DAILY_FREE_AI_COACH_LIMIT: "5"
};

test("daily free access starts with full allowance and advances safely", () => {
  let now = Date.UTC(2026, 9, 5, 15, 0, 0);
  const controller = createDailyFreeAccessController(env, { now: () => now });
  const initial = controller.read("", "user-1");
  assert.equal(controller.status(initial).remaining, 5);
  const one = controller.advance(initial);
  assert.equal(one.status.used, 1);
  assert.equal(one.status.remaining, 4);
  assert.match(one.cookie, /HttpOnly/);
  assert.match(one.cookie, /SameSite=Strict/);
});

test("daily free access resets on a new UTC day", () => {
  let now = Date.UTC(2026, 9, 5, 23, 59, 0);
  const controller = createDailyFreeAccessController(env, { now: () => now });
  let current = controller.read("", "user-1");
  const advanced = controller.advance(current);
  const cookieHeader = advanced.cookie.split(";")[0];
  now = Date.UTC(2026, 9, 6, 0, 1, 0);
  current = controller.read(cookieHeader, "user-1");
  assert.equal(controller.status(current).used, 0);
  assert.equal(controller.status(current).remaining, 5);
});

test("daily free access fails closed when secret is missing", () => {
  const controller = createDailyFreeAccessController({
    DAILY_FREE_ALLOWANCE_ENABLED: "true"
  });
  assert.equal(controller.configured, false);
});
