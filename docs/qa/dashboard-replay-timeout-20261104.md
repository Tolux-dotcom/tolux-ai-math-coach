# Dashboard replay timeout — November 4, 2026

## Scope and story

Work branch: `fix/dashboard-replay-timeout-nov04`, based on PR #130 head
`23fb7e11ef4f4b5037b8668d86a7474087d0cd61`. Current main remains `8b186b3`.
Dashboard load replays original-owner pending lesson/Practice reports before
loading account history. A stalled POST or successful response body previously
blocked that sequence indefinitely.

Each replay HTTP attempt now has a 15-second deadline covering fetch and JSON
parsing. Timeout aborts the request and stops the batch, allowing the existing
history-load path to proceed instead of waiting for each of up to 25 records.
Transport/body exceptions also stop this batch. Pending records are not removed
or rewritten on failure. A later replay uses the exact original report and ID.
The same-owner session checks and single 401-refresh retry remain unchanged;
each HTTP retry is bounded separately. No automatic timeout retry was added.
Late responses have no queue-removal side effects after timeout.

## Executed evidence

- Regression-first: three new tests failed on the original dashboard because
  replay/history never settled; original set 26/29 passed.
- Five new regressions cover request stall, body stall, late replies, exact
  retry, continued history loading, bounded 401 retry, account-switch denial
  after timeout and timer cleanup on success.
- Focused dashboard/replay/Practice/Tutor ownership tests: **100/100**.
- Full branch: **891/891**, zero failures/skips (parent had 886 tests).
- Fresh unchanged main: **534/534**, zero failures/skips.
- `npm run check` and `git diff --check`: passed.
- Existing mathematical answer-key and runtime validations passed. No grading,
  mathematical content or answer keys changed.
- Three older VM harnesses now provide browser AbortController and timer APIs;
  their ownership and damaged-storage assertions are retained, not weakened.
- Disposable local dummy-config HTTP: dashboard and app.js returned 200;
  served app.js matched tested source. Unauthenticated progress GET/POST were
  401. No privileged Supabase, Stripe or OpenAI credentials were supplied.

## Limits and release gates

Tests accelerate only the 15-second timer to 10ms inside the VM. This is not
real-browser slow-network, real-account or database-write evidence. A timeout
does not prove the server did not save; same-completion retry is essential.
History GET, Supabase session reads/refreshes and Test Prep's separate flush
can still stall and require separate bounded work. Successful account-history
loading is not proof that every pending result synchronized.

Keep PR #130 draft. PR #137 needs this parent follow-up reconciled and retested
before approval. Real-account A/B switching, sign-out/sign-in, expired sessions,
offline/slow recovery, cross-device and physical-phone QA remain required.
Stripe sandbox lifecycle testing remains separate. No production deployment,
student-data mutation/deletion, auth policy, entitlement, billing, price, secret,
schema or usage-limit change. No historical lost result was reconstructed.

No complete instructional cycle was added; authored banks/catalog mappings do
not establish complete instruction–practice–mastery–remediation coverage.
See the PR body for the exact published commit, tested tree and preview evidence.
