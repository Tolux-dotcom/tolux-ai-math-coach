# Bounded progress-save requests, November 2, 2026

## Bounded task

Draft PR #130's shared saver waited indefinitely for fetch or response JSON.
A stalled request could therefore leave the completion screen waiting rather
than returning the existing truthful queue/unsaved status and retry control.

Each HTTP save attempt now has a 15-second deadline covering fetch and body
parsing. Timeout aborts the request and returns failure without clearing the
original pending result. Explicit retries retain the original report/ID. The
existing same-owner 401 refresh still permits only one retry, each attempt
bounded separately. No automatic retry was added after a timeout. A server may
have saved before the response was lost; same-completion retry remains essential.

## Evidence

- Six isolated regressions failed before implementation and pass afterward.
- New timeout set: 7/7 passed, including actual local native-fetch abort and
  connected retry against a disposable HTTP server, with no database or Stripe.
- Full branch: 886/886 passed; fresh main `8b186b3`: 534/534 passed.
- Syntax and diff checks passed. Existing mathematical validations passed.
- Dummy-config app smoke: dashboard/Tutor/Practice/helper 200; helper matched
  source; unauthenticated progress GET/POST 401. Privileged Supabase, Stripe and
  OpenAI credentials were absent.
- Tests cover stalled request/body, unavailable storage, bounded 401 refresh,
  exact-report retry, switched-owner denial, late response isolation, and timer
  cleanup after success.

## Limitations and release gates

This bounds only the shared helper's HTTP transport and body read. Supabase
session reads/refreshes and the dashboard's separate replay/history requests
remain outside this deadline. Test Prep's separate saver is unchanged. A timeout
does not prove that the server did not save and must not produce a new ID.

Real-account, desktop/phone, private-mode, slow-network, expired-session and
cross-device verification remains required. PR #137's current preview predates
this helper follow-up; synchronize/retest that stacked draft before approval.
No production deployment, auth-policy change, secrets, database mutation, price,
billing or entitlement change. No historical missing score was recovered and
no complete instructional cycle was added. Coverage still requires a dedicated
audit, not counting mapped catalog standards.
