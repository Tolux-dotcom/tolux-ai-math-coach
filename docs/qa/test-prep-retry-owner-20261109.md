# Test Prep manual retry ownership — November 9, 2026

## Defect and scope

Draft #134 preserved completion IDs across same-page retries but reacquired
the current session without checking the first save's account. After a failed
save as A, Retry while signed in as B could POST the same result using B's token.
The defect was reproduced with both working and blocked device storage.

The saver returns the authenticated first-save owner in its in-memory outcome.
The runner keeps it with the original completion ID and timestamp. A retry
requires an active session for that same owner before any storage write or POST.
On mismatch or sign-out it asks the learner to sign back into the original
account; Retry remains available. The original owner can submit the same report
when they return. This binding does not depend on successful browser storage.
No owner identifier is added to the POST report. Signed-out first saves, launch
gates, scoring and the server authorization contract are unchanged.

## Executed QA

- Both new runner/saver integration cases reproduced the unwanted second POST
  before the fix (25/27 passed). They now verify no wrong-account/signed-out
  POST or storage change, correct guidance, and byte-identical same-owner retry.
- Focused Test Prep runner/persistence: 33/33 passed.
- Full draft branch: 546/546 passed; unchanged main `8b186b3`: 534/534 passed.
- Syntax, diff and existing mathematical answer-key validations passed.
- Local dummy-config HTTP: Test Prep returned 200 and both served scripts
  matched source; unauthenticated progress GET/POST returned 401.
- No authenticated database calls, real student accounts or charges.

## Limits and next step

This guards same-page retries after an authenticated save attempt, not ownership
from the start of the assessment or all session changes during an in-flight
request. Dashboard replay behavior, session lookup/refresh deadlines and the
existing same-owner 401 retry are unchanged. Real-account preview QA with
two authorized test accounts, desktop/phone and sign-out/sign-in/cross-device
checks remains required before approval. Coordinate #130/#137 before release.

No production deployment, main merge, secret, price, payment, entitlement,
auth-policy, schema or student-data change. No new instructional cycle.
Exact tested commit and preview evidence are recorded on #134.
