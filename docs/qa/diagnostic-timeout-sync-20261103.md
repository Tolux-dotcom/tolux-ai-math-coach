# Diagnostic timeout integration — November 3, 2026

## Bounded change

Reconciled draft PR #137 with PR #130 head
`23fb7e11ef4f4b5037b8668d86a7474087d0cd61`. The shared account saver now
bounds each fetch/body-read attempt to 15 seconds. This integration does not
change that deadline, authentication policy, report contents or answer keys.

Added a diagnostic DOM-runtime regression for a stalled save. It verifies that
completion returns a truthful queued status, exposes an enabled Retry button,
and retains the original pending report. A successful explicit retry sends the
exact same report (including completion ID), changes the visible status to saved,
hides Retry and removes the pending entry. The test accelerates only the
15-second deadline to 10 milliseconds; production code has no test-only flag.

The inherited timeout suite separately covers stalled response bodies, native
fetch abort against a disposable local server, bounded 401 refresh retry,
owner-switch denial, late responses and unavailable browser storage. Timeout
does not imply the server failed to write, so preserving the completion ID is
essential. No automatic timeout retry was introduced.

## Executed evidence

- Focused diagnostic/access/runtime/ownership/storage/timeout tests: **73/73**.
- Full integrated branch: **906/906**, zero failures or skips.
- Fresh main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`: **534/534**.
- `npm run check`, test-file syntax and `git diff --check`: passed.
- Existing mathematical answer-key validations in the full suite: passed;
  no grading, questions, answer keys or instructional content changed.
- Disposable local HTTP server with dummy public configuration and no
  privileged Supabase, Stripe or OpenAI credentials: readiness landing,
  diagnostic lesson and both helper assets returned 200. Served shared saver
  matched the source. Unauthenticated progress GET and POST returned 401.
- The runtime harness is not a real browser or real account. Local smoke tests
  made no authenticated database writes or payment calls.

## Draft dependency and limits

PR #137 remains stacked on unmerged PR #130. Do not merge/deploy either without
review and approval; retarget/retest #137 after the parent lands. Check the PR
body for the exact published commit and current preview evidence.

Real-account sign-out/sign-in, student A/B isolation, expired sessions, slow/offline
recovery, private mode, physical-phone and cross-device QA remain release gates.
Supabase session reads/refreshes and dashboard replay/history requests have
separate timing behavior, outside this transport deadline. Test Prep's separate
saver and its historical missing-score report are not repaired or recovered by
this work. Stripe sandbox lifecycle QA remains separate.

No production deployment, database mutation, student-data deletion, secret,
price, billing, entitlement, auth-policy or usage-limit change. No complete
instruction–practice–mastery–remediation cycle was added. Authored banks and
catalog mappings must not be counted as complete instruction; a dedicated
coverage audit is still needed for a reliable remaining count.
