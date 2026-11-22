# Half Test access-check deadline — November 22, 2026

## Scope

Branch `fix/half-test-access-timeout-nov22` continues draft #134. Main `8b186b3`,
open issues #5/#66, all open PR heads, reviews and prior work inspected. No new
conflicting work or formal review found; no AGENTS.md present.

The Half Test runner's getSession had no deadline. A stalled lookup retained
accessCheckPending and disabled its button indefinitely, also blocking other mode
starts. Other lookup failures were treated as confirmed sign-out, asking a possibly
signed-in learner to create an account.

The lookup now has a 15-second deadline with timer cleanup. SDK errors/rejections,
missing client or timeout produce a generic cannot-verify/try-again message; the
existing finally block restores the start button and clears pending state. No
Half Test starts on error. Confirmed null sessions still require a free account.
Successful checks retain existing client-side user-presence policy. Quick Check
and server-verified Full Simulation paths unchanged.

## Executed evidence

- Four regressions failed before fix: 2/6 new tests passed (timeout, SDK error,
  rejection, missing client failed). All six now pass.
- Actual runner access functions in VM with synthetic client/DOM/timers verify
  no start on failure, restored button/pending state, truthful feedback, no late
  response start/message mutation, and a fresh successful check after recovery.
- Controls verify confirmed signed-out behavior, cleared success timer and
  ungated Quick Check. Production timeout is accelerated to 10ms in tests.
- Focused access/persistence/runner 91/91; full branch 604/604; main 534/534.
  Syntax, diff checks and existing mathematical validations passed.
- Dummy-config HTTP: Test Prep 200; runner 200/exact source parity;
  unauthenticated progress GET/POST 401. No real accounts, DB writes or charges.
- Current Supabase changelog/getSession docs and security checklist reviewed:
  https://supabase.com/changelog.md
  https://supabase.com/docs/reference/javascript/auth-getsession
  No SDK upgrade, privileged key, RLS/schema or server authorization changes.
- See #134 for exact published/tested tree, commit, preview and CI evidence.

## Limits / approval gates

This is a client UX deadline, not SDK cancellation or a new server entitlement
boundary. Half Test retains its existing client sign-in gate. The SDK lookup may
finish later, but cannot resume this timed-out mode start. Whole-assessment owner
binding, Full Simulation SDK/session deadlines, persistence races and historical
recovery are separate work. VM checks are not real-account browser/phone proof.

Before approval: authorized signed-in/signed-out desktop and physical-phone Half
Test starts, slow/offline session recovery, then complete a result and confirm
cross-device history. Coordinate #130/#137. No main merge, production deployment,
billing/pricing, auth-policy, student-data deletion, scoring or curriculum change.
No complete instructional cycle added.
