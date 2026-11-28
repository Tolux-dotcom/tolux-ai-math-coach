# Full Simulation access deadline — November 23, 2026

## Scope and inspection

Continues draft PR #134 on local branch `fix/full-simulation-access-deadline-nov23`.
Inspected main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`, open issues #5/#66,
open PRs and prior draft work. PR #134 previously ended at
`484f203f11eae2509a77e81eec0df68c2dbfd0e9` (Half Test access deadline).
This extends the existing isolated Test Prep draft rather than creating a competing
runner/access implementation in another PR. No changes to main or production.

## User story and fix

Start Full Simulation → get session → server entitlement check → optionally refresh
an expired token and check once more → parse result → start only on verified access.
Any pending stage could previously leave the start button disabled indefinitely.

`public/subscriber-access-client.js` now applies **one 15-second total deadline** to
that sequence. Timeout resolves as 503/allowed:false, aborts fetch, and lets the
existing runner display its retry-later message and release its pending flag/button.
Checks before requests prevent late session/refresh completion from sending a token;
a late 401 cannot initiate refresh. Late successful responses cannot start the test.
Normal completion clears the timer. The original one-refresh limit and the server's
authentication/entitlement decisions remain unchanged.

## Executed evidence

- Before implementation, all five stalled-stage regressions failed with
  `Full Simulation access remained stalled` (250ms test guard). The timer-cleanup
  test also failed because the original fetch had no AbortSignal.
- Seven new tests execute the actual helper plus the actual runner start handler in
  a Node VM with synthetic sessions/responses and minimal DOM stubs. Production's
  15000ms timer is accelerated to 10ms. Stages: initial session lookup, first fetch,
  refresh, second fetch, JSON parsing. Tests assert one timer budget, fail-closed UI,
  released button/flag, aborted fetch signal, no late follow-on work, successful fresh
  retry, timer cleanup, and ignored late successful authorization.
- Focused: `node --test test/full-test-access-timeout.test.mjs
  test/test-prep-subscriber-access.test.mjs test/half-test-start-access.test.mjs`
  **24/24 passed**, including existing free/paid/signed-out/expired-token cases.
- `npm run check`, `node --check test/full-test-access-timeout.test.mjs`,
  `git diff --check`: passed.
- `npm test`: **611/611 passed** on this draft; fresh main worktree **534/534 passed**.
  Existing mathematical grading and answer-key tests passed as part of these suites.
  No mathematical content, answer key, scoring or curriculum coverage was changed.
- Local HTTP smoke with dummy Supabase configuration and no privileged/payment keys:
  `/test-prep.html` 200; helper 200 and byte-identical to tested source;
  unauthenticated `/api/test-prep/full-access` 401. No real account/database writes.

## Limits and release gates

- VM/HTTP evidence is not real authenticated desktop or phone browser QA. Before
  approval, verify signed-out, free, active subscriber and expired-token flows in
  preview, plus throttled/offline recovery and cross-device saved results.
- A stalled Supabase SDK operation itself cannot be cancelled by this wrapper;
  its late result is ignored and cannot initiate a new entitlement request. Fetch
  receives AbortSignal, but a custom implementation may ignore it. Browser timer
  throttling can delay when the deadline callback runs.
- This does not add server-side assessment delivery, hide public answer keys, bind
  an entire assessment to one session, or resolve every separate draft dependency.
- No production secrets/configuration, subscription prices, Stripe flows, database
  data, saved attempts or access policy were changed. No curriculum instruction or
  complete TEKS instructional cycle was authored.
- Preview/check status is recorded on PR #134 after publishing, not presumed from
  local tests. No merge, production deployment or readiness approval is implied.

## Documentation checked

- https://supabase.com/changelog.md (November 23; recent breaking changes concern
  platform branch permissions, CLI and Flutter, not these JavaScript calls).
- https://supabase.com/docs/reference/javascript/auth-getsession
- https://supabase.com/docs/reference/javascript/auth-refreshsession

getSession is used only to obtain a bearer token; server verification, not local
session data, remains the authorization authority. No RLS, schema or key changes.
