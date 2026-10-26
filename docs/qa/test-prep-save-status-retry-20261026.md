# Test Prep save-status and retry QA — 2026-10-26

## Scope

This draft fixes one Test Prep persistence failure mode on current `main`:

- a failed account save is described as queued only when the account-owned browser retry record was actually written;
- a result stored only as a device copy is distinguished from an account-owned queue;
- complete storage and network failure is reported as unsaved instead of saved;
- the results screen offers **Retry Progress Save** for recoverable failures; and
- retry reuses the original completion ID, timestamp, score, and item records instead of creating a second attempt.

Quick Check remains available signed out. Half Test and Full Simulation access rules are unchanged.

## Automated evidence

- Regression-first run on the untouched implementation: **21/23 passed**. The new tests reproduced both defects: storage plus network failure incorrectly returned `queued`, and no Test Prep retry control existed.
- Focused persistence and runner tests after the fix: **24/24 passed**.
- Broader Test Prep, progress-endpoint, grading, and subscriber-access tests: **44/44 passed**.
- Syntax: `npm run check` — passed.
- Complete repository suite: `npm test` — **493/493 passed**, with no failures or skips.
- Current `main` baseline before this branch: **490/490 passed**. The three additional passing tests cover truthful storage failure, duplicate-safe retry, and retry UI wiring.

The duplicate-safety test executes a 503 followed by a successful retry and proves both requests contain the exact same completion report.

## Safe local HTTP QA

- `/test-prep.html` returned HTTP 200.
- `/assessment-progress.js` returned HTTP 200 and exactly matched the tested source.
- `/test-prep.js` returned HTTP 200 and exactly matched the tested source.
- Unauthenticated GET and POST requests to `/api/lesson-progress` returned HTTP 401.

## Safety

- No production deployment or merge.
- No database or existing student-data write, deletion, reset, reconstruction, or reassignment.
- No authentication policy, Stripe, payment, price, entitlement, secret, schema, assessment item, answer key, grading, or curriculum change.
- This does not reconstruct a Test Prep result that was already lost before the browser stored it.

## Remaining approval gates

Use a disposable signed-in preview account before approval:

1. complete Quick Check and confirm the normal account-saved message;
2. interrupt or block the first save, confirm the queued message and retry control, then retry;
3. verify exactly one result after dashboard reload and on another device;
4. repeat with an expired token and an account switch;
5. verify the completely unsaved message in private mode or a controlled storage-failure fixture; and
6. repeat on a physical phone.

