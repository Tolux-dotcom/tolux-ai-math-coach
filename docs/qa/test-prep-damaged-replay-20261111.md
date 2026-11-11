# Test Prep rejected-report replay — November 11, 2026

## Bounded task

Branch `fix/test-prep-damaged-replay-nov11` continues draft #134.
One server-rejected queued report previously stopped automatic replay, blocking
later valid results. The batch now continues only after an explicit HTTP 400.
The rejected report stays in the queue. Only confirmed successes are removed;
the batch summary remains partial while rejected entries remain.

No local schema guessing or duplicate client validator was introduced. Server
validation remains authoritative. Ownership checkpoints, one-time 401 refresh,
timeouts and stopping on all other non-success responses are unchanged.

## Evidence

- Three invalid-entry regressions failed before implementation (32/35 tests
  passed). Null, empty-object and malformed-ID/score records are tested with
  responses decided by the real server report normalizer. Each valid following
  report now posts unchanged; each rejected entry remains serialized in storage.
- A fourth test verifies unchanged stop-and-retain behavior for 401, 403, 429,
  503 and network exceptions.
- Focused persistence/runner 41/41; full branch 554/554; unchanged main
  `8b186b3` 534/534 passed. Syntax, diff and mathematical checks passed.
- The fixture can explicitly defer its automatic initial replay so tests seed
  damaged records without racing an unrelated background replay. Existing
  automatic-replay tests are retained.
- Dummy-config HTTP: Test Prep 200, saver matched source, unauthenticated
  progress GET/POST 401. No real account, database writes or charges.

## Limits and release gates

This does not repair rejected reports or recover a wholly malformed JSON queue.
400 responses are retried on later visits; there is no new quarantine/deletion
UI. Successful reconciliation still uses the existing completion-ID removal
semantics. Browser/server authenticated integration, two-account isolation,
desktop/phone, expired-session and cross-device QA remain required.

No main merge, production deployment, student-data deletion, server auth policy,
entitlement, Stripe, pricing, schema, scoring or curriculum changes. No complete
instructional cycle added. See draft #134 for the exact commit and preview.
