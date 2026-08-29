import test from "node:test";
import assert from "node:assert/strict";

import {
  createInternalQaController,
  INTERNAL_QA_COOKIE,
  INTERNAL_QA_MAX_AGE_SECONDS
} from "../internal-qa.mjs";

const authorizedUserId = "cefac2b0-5c7c-46ca-bc63-58900aacb001";
const otherUserId = "3a6fc167-56bd-4236-b99c-6dc7cc829c0a";
const previewEnvironment = {
  VERCEL_ENV: "preview",
  INTERNAL_QA_ENABLED: "true",
  INTERNAL_QA_USER_IDS: authorizedUserId,
  INTERNAL_QA_COOKIE_SECRET: "test-only-cookie-secret-that-is-long-enough"
};

test("internal QA is disabled outside an explicitly configured preview", () => {
  const production = createInternalQaController({
    ...previewEnvironment,
    VERCEL_ENV: "production"
  });
  const missingSecret = createInternalQaController({
    ...previewEnvironment,
    INTERNAL_QA_COOKIE_SECRET: "too-short"
  });

  assert.equal(production.configured, false);
  assert.equal(production.isAuthorized(authorizedUserId), false);
  assert.equal(missingSecret.configured, false);
});

test("only an allowlisted user can start a signed QA session", () => {
  const qa = createInternalQaController(previewEnvironment);

  assert.equal(qa.configured, true);
  assert.equal(qa.start(otherUserId), null);

  const started = qa.start(authorizedUserId);
  assert.equal(started.session.questionsUsed, 0);
  assert.match(started.cookie, new RegExp(`^${INTERNAL_QA_COOKIE}=`));
  assert.match(started.cookie, /HttpOnly/);
  assert.match(started.cookie, /Secure/);
  assert.match(started.cookie, /SameSite=Strict/);
  assert.deepEqual(
    qa.readSession(started.cookie, authorizedUserId),
    started.session
  );
  assert.equal(qa.readSession(started.cookie, otherUserId), null);
});

test("QA usage advances in signed browser state without student_usage writes", () => {
  const qa = createInternalQaController(previewEnvironment);
  let current = qa.start(authorizedUserId);

  for (let interaction = 1; interaction <= 10; interaction += 1) {
    current = qa.advance(current.session);
    assert.equal(current.session.questionsUsed, interaction);
    assert.deepEqual(
      qa.readSession(current.cookie, authorizedUserId),
      current.session
    );
  }

  assert.equal(current.session.questionsUsed, 10);
});

test("tampered and expired QA cookies are rejected", () => {
  let currentTime = 1_800_000_000_000;
  const qa = createInternalQaController(previewEnvironment, {
    now: () => currentTime
  });
  const started = qa.start(authorizedUserId);
  const [cookieValue, ...attributes] = started.cookie.split("; ");
  const tamperedCookie =
    `${cookieValue.slice(0, -1)}x; ${attributes.join("; ")}`;

  assert.equal(qa.readSession(tamperedCookie, authorizedUserId), null);

  currentTime += (INTERNAL_QA_MAX_AGE_SECONDS + 1) * 1000;
  assert.equal(qa.readSession(started.cookie, authorizedUserId), null);
});

test("ending QA clears the host-only signed cookie", () => {
  const qa = createInternalQaController(previewEnvironment);
  const cleared = qa.clearCookie();

  assert.match(cleared, new RegExp(`^${INTERNAL_QA_COOKIE}=`));
  assert.match(cleared, /Max-Age=0/);
  assert.match(cleared, /Path=\//);
});
