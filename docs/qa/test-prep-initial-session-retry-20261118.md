# Retry after unavailable first account check — November 18, 2026

## Bounded scope

Branch `fix/test-prep-initial-session-retry-nov18` continues draft #134. Main
`8b186b3`, issues #5/#66, all open PR heads and prior automation work inspected;
no conflicting new commits or formal review found.

The first save's getSession timeout/error used to look like a confirmed null
session. With working storage the UI hid Retry and advised only future-session
sign-in, leaving a possibly signed-in learner unable to recover this result.

The first lookup now preserves errors as a session-unavailable outcome. The UI
states it could not check the account, accurately distinguishes device-saved
from device-unsaved, asks the learner to keep the page open, and retains Retry.
No account queue or POST occurs until a subsequent explicit retry obtains a
session. Confirmed signed-out outcomes retain their previous behavior. Existing
original-owner retries, post-response checks and server authorization unchanged.

## Executed evidence

- Six new VM runner/saver cases failed before implementation: 59/65 persistence
  tests passed. Timeout, SDK error result and rejected lookup, each with working
  and blocked storage. Tests use accelerated timeout, not real-account requests.
- After implementation all six verify visible/enabled Retry, truthful messages,
  zero initial POST/owned queue writes, no late-response mutation/automatic save,
  and exact same-attempt recovery using the subsequent checked session/token.
- Added signed-out UI control: Retry still hidden; no POST/account attribution.
- Updated one prior timeout assertion for the intentional new outcome.
- Focused persistence/runner 72/72; full branch 585/585; main 534/534. Syntax,
  diff checks and existing mathematical answer-key validations passed.
- Dummy-config HTTP: page 200, both scripts 200 with source parity;
  unauthenticated progress GET/POST 401. No real account/database/payment writes.
- Current Supabase changelog and getSession docs checked:
  https://supabase.com/changelog.md
  https://supabase.com/docs/reference/javascript/auth-getsession
  Security checklist reviewed: no privileged keys, metadata-based authorization,
  SDK/config upgrade, RLS/schema/server-policy change.
- See #134 for exact published/tested tree, commit, CI and preview evidence.

## Limits / approval gates

This only distinguishes first-lookup failure from confirmed signed-out state.
No original account was established on that failed lookup; explicit Retry uses
the first successful session, as the existing first-save ownership model does.
Whole-assessment start-account binding remains separate work. Known-owner retry
lookup failures still use original-account-required. SDK operations are not
canceled; late values cannot resume this save. No historical recovery or new
cross-device proof. Keep the result page open, especially with blocked storage.

Before approval: real-account desktop/physical-phone first-check outage/recovery,
two-account isolation and cross-device history QA; coordinate #130/#137. No main
merge, production deployment, billing/prices, auth policy, student-data deletion,
scoring or curriculum changes. No complete instructional cycle added.
