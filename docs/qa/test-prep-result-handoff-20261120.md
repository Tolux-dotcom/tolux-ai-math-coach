# Test Prep completion-save handoff — November 20, 2026

## Bounded scope

Branch `fix/test-prep-pending-result-handoff-nov20` continues draft #134. Main
`8b186b3`, issues #5/#66, all open PR heads, reviews and prior work checked.
No conflicting new commits or formal review found.

The runner skipped saveLastResult when another save was in flight. If a newer
completion replaced lastSaveInput during that wait, the old outcome was correctly
ignored, but nothing started the newer save. It could remain unsaved with no
useful final status. Now a superseded attempt hands off to the latest completion
after settling. A flag distinguishes replacement input from normal same-attempt
metadata updates, preventing endless or duplicate resaves.

Only public/test-prep.js, tests and this QA record changed. Saver, original-owner
checks, report construction, IDs, scoring and server authorization unchanged.

## Evidence

- Three regression tests failed first: 72/75 persistence tests passed.
- Actual runner and saver run together in VM. During a delayed previous POST,
  a new completion is supplied and its initial save call is skipped by the guard.
- Previous HTTP 200, HTTP 503 and network-exception cases now each trigger one
  subsequent POST for the newer result, with distinct ID, correct mode/score and
  owner. Latest success controls the UI; failed older reports remain byte-identical
  in their owner's queue. Normal same-attempt retry tests remain green.
- Focused persistence/runner 81/81; full branch 594/594; main 534/534. Syntax,
  diff checks and existing mathematical answer-key validations passed.
- Dummy-config HTTP: Test Prep 200; runner 200/exact source parity;
  unauthenticated progress GET/POST 401. No real accounts, DB writes or charges.
- See #134 for exact published/tested tree, commit, preview and CI evidence.

## Limits / approval gates

This handles the latest replacement result after one in-flight attempt; it does
not add a FIFO queue for multiple rapid replacements. Intermediate replacements
before handoff can still be superseded. Whole-assessment account binding, SDK
cancellation, atomic cross-tab locking and historical score recovery are outside
scope. VM integration is not rendered browser or real-account persistence proof.

Before approval: real-account desktop/physical-phone retake/mode-switch during
slow/offline saves, latest-save failure/Retry, account switching and cross-device
history QA. Coordinate #130/#137. No main merge, production deployment, billing,
prices, auth-policy, student-data deletion, schema, scoring or curriculum changes.
No complete instructional cycle added.
