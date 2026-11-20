# Test Prep session deadlines — November 12, 2026

## Scope

Branch `fix/test-prep-auth-deadlines-nov12` continues draft #134. Main remains
`8b186b3`; issues #5 and #66 and all open PR heads were inspected. The existing
POST timeout did not bound Supabase session reads or the single 401 refresh.
Those waits could keep completion saving or pending replay stalled indefinitely.

Each session read and refresh now has a 15-second deadline with timer cleanup.
There is no SDK cancellation API introduced: the underlying auth operation can
finish later, but its late return cannot resume this timed-out save or acknowledge
a result. Server authorization and all original-account checkpoints remain.
The existing UI receives its existing local-only/queued/unsaved or original-account
required outcomes, permitting retry rather than waiting indefinitely.

## Executed evidence

- Five new tests failed before the fix (35/40 persistence tests passed): first
  session lookup, pre-POST lookup, post-response lookup, token refresh, and the
  initial replay lookup. Tests accelerate the production 15-second timer to 10ms.
- After the fix: focused persistence/runner 46/46, full branch 559/559,
  unchanged main 534/534. Syntax, diff checks and existing answer-key/math
  validations passed. No grading or answer-key changes.
- Late auth returns cannot change pending storage or issue another save POST.
  Recovery reuses byte-identical reports and original completion IDs.
- Dummy-config local HTTP: Test Prep 200, saver 200 with exact source parity,
  unauthenticated progress GET/POST 401. No real account/database/payment writes.
- Supabase changelog and getSession/refreshSession documentation checked:
  https://supabase.com/changelog.md
  https://supabase.com/docs/reference/javascript/auth-getsession
  https://supabase.com/docs/reference/javascript/auth-refreshsession
  No SDK/configuration upgrade; security checklist reviewed. No privileged keys
  added, no authorization-policy or database changes.

## Limits and approval gates

This is a per-operation deadline, not a 15-second total batch deadline. Initial
session timeout still uses existing signed-out/local-only outcomes; no new error
taxonomy/UI. It cannot abort an SDK-side refresh or a server-accepted POST. A
late SDK operation may affect the SDK's session independently; future retries
must still pass the live original-account checks. No historical score recovery.

Real-account desktop/phone, expired-session, account switching and cross-device
tests remain required before approval. No formal review. Coordinate #130/#137
before release. See #134 for the exact published commit, CI and preview evidence.
No main merge, production deployment, student-data deletion, entitlement, Stripe,
prices, schema or curriculum changes. No complete instructional cycle added.
