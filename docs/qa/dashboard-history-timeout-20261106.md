# Dashboard history deadline — November 6, 2026

## Bounded change

Work branch `fix/dashboard-history-timeout-nov06` starts from PR #130 head
`b1d909fe9203d07612c6f98589a37614acdf379f`. Current main is `8b186b3`.
The dashboard already bounded replay POSTs but its subsequent account-history
GET and response JSON could wait indefinitely, preventing fallback feedback.

Each history HTTP attempt now has a 15-second deadline covering fetch and body
parsing. Timeout aborts the request and enters the existing owner-confirmed
device fallback, with the existing temporarily-unavailable message. The GET
does not remove or rewrite local/pending records. Late replies cannot render
after the deadline. The existing one-time 401 refresh/retry remains; each HTTP
attempt is bounded separately. A 401 body is not parsed, allowing refresh even
when that unauthorized response body would stall. No automatic timeout retry
or auth-policy change was added.

## Executed evidence

- Regression-first: three new tests failed on untouched history loading because
  fallback never settled; original focused file **31/34 passed**.
- Five new tests cover stalled request/body, abort, truthful owned fallback,
  byte-preserved local data, late-response isolation, recovery, account-switch
  denial, bounded 401 retry and timer cleanup on success.
- Focused dashboard/ownership/storage/Test Prep tests: **121/121 passed**.
- Full branch **896/896 passed**, zero failures/skips; parent had 891 tests.
- Fresh unchanged main **534/534 passed**, zero failures/skips.
- `npm run check`, test syntax and `git diff --check`: passed.
- Existing mathematical answer-key and runtime validations passed; no grading,
  bank, answer key or instructional-content changes.
- Two older Test Prep VM contexts now provide browser AbortController/timers;
  existing ordering, refreshed-token and error-path assertions are retained.
- Dummy-config local HTTP: dashboard and app.js 200; script exactly matched
  source; unauthenticated progress GET/POST 401. No privileged Supabase, Stripe
  or OpenAI credentials, student records, authenticated writes or payments.

## Limitations and release gates

The VM accelerates only the 15-second deadline to 10ms. These tests are not
real-browser, real-account or cross-device evidence. Supabase session reads and
refreshes, Test Prep's separate flush and repeated successful replay requests
can still delay dashboard loading; this is not an end-to-end 15-second cap.
No historical missing score was recovered. Stripe sandbox QA remains separate.

Keep PR #130 draft for review and real-account desktop/phone, privacy-mode,
expired-session, account-switch, slow/offline and cross-device verification.
PR #137 must reconcile/retest this parent follow-up before approval. Exact
published commit, tested tree and preview evidence are recorded in the PR body.

No merge to main, production deployment, student-data mutation/deletion, secret,
price, billing, entitlement, schema, usage-limit or authentication-policy change.
No complete instructional cycle added. Catalog mappings/authored banks are not
proof of complete instruction–practice–mastery–remediation–reassessment coverage.
