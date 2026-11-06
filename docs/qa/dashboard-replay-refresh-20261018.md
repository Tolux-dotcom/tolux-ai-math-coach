# Dashboard progress replay refresh — October 18, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `7614c70512c2691dff493758ac34855b25a9b71b`.

## Bounded task

After the prior Tutor/Practice ownership changes, dashboard replay still retained a 401-rejected report without refreshing and retrying it. This could leave a student's offline work pending even when the same student's refreshed session could save it.

`syncPendingLessonProgress` now retries one 401 for an owned report with a refreshed token only after confirming the original account before refresh, validating the refresh result, and checking the active account again. It sends the exact original report, including the completion id, score, timestamp, and item records. Later records read the current same-owner token rather than the dashboard's stale argument.

A repeated 401, missing/failed refresh, sign-out, or account change stops the replay batch without clearing recovery records. This prevents a refresh storm across all 25 pending records. Confirmed success still requires an activity response and a final ownership check after JSON parsing. Other unsuccessful responses stay queued. Unowned legacy Tutor/Practice records remain excluded from automatic replay; no owner is inferred.

Server-verified authentication and server-derived database ownership remain unchanged. The new browser checks are recovery guards, not authorization. No RLS, schema, privileged credential, account-security setting, trial rule, entitlement policy, or authentication policy changed.

## Executed evidence

- `npm run check`: passed.
- New replay-refresh cases: **26/26 passed** (12 cases each for Tutor and Practice, plus two dashboard-level history integration cases).
- Focused replay, Tutor/Practice runtime, persistence, mathematical grading, readiness, and access-policy set: **100/100 passed**.
- Full branch suite: **768/768 passed**, zero failed/skipped.
- Fresh detached current-main baseline: **490/490 passed**, zero failed/skipped.
- Cases cover same-owner 401 recovery, exact-payload retry, continuation with the fresh token, repeated-401 batch stop, sign-out, switched/tokenless sessions, account changes before/during refresh, refresh errors/exceptions, account changes during retry/JSON parsing, malformed success, 503, offline retry, and unchanged successful-token behavior.
- Dashboard integration executes the real replay and history-loading functions: a successful replay refresh supplies the subsequent history GET token and renders account progress; refresh into another account does not load the prior student's history or clear pending work.
- The fixture runs actual dashboard source and checks successful report responses against the server report normalizer. Existing real Tutor mastery, Practice scoring, explanation, remediation/recheck, readiness, and mathematical answer-key tests all pass. No mathematical content or grading changed; this is not a new exhaustive answer-key audit.
- Isolated local server with dummy public auth and no database, Stripe, or OpenAI credentials served dashboard HTML, changed `app.js`, Tutor HTML, and Practice HTML with 200. Deployed-source checks aside, local `app.js` matched disk exactly. Unauthenticated progress GET and POST both returned 401. No database writes occurred.
- Current Supabase changelog, getSession, and refreshSession documentation checked. Local session data is not trusted as server authentication. No Supabase settings were changed.

## Verification story and boundary

Story: dashboard opening replays an original-owner completion → authenticated progress POST returns 401 → same-owner refresh → exact-report retry → confirmed save → history GET uses the fresh token → dashboard renders account progress.

| Boundary | Evidence |
| --- | --- |
| Replay and retry request | Actual browser functions with simulated auth/network; original payload preserved |
| Server report validation | Real normalizer accepts the completion report |
| History response and rendering | Actual refresh function with fixture responses and captured render calls |
| HTTP serving/auth rejection | Local assets 200; unauthenticated progress GET/POST 401 |
| Authenticated database write and physical browser | Unverified; requires authorized test accounts and devices |

These fixtures do not establish a real Supabase session refresh, authenticated database write, browser rendering, offline reload, phone operation, or cross-device persistence. No formal review is recorded. Keep #130 draft until two-account offline recovery, expired-token recovery, and second-device reload pass on desktop and a physical phone without clearing browser data. The full student-journey release gate in #5 and independent Stripe sandbox lifecycle/customer-entitlement QA still apply.

## Safety and remaining work

No merge or production deployment. No student record was deleted, reset, reassigned, or migrated in a live system. No database operation, secret, price, payment, curriculum bank, or answer key change was performed. Test Prep's separate queue is unchanged.

Old unowned results still require explicit owner-confirmed recovery. Earlier generic/Batch/specialized Practice storage-failure messaging and malformed stored-record isolation remain separate work. Draft #103 must not overwrite current owner-safe protections. No complete instructional cycle was authored; all 49 expectations' banks require a dedicated instruction–practice–mastery–remediation–reassessment completeness audit before a reliable remaining count can be stated.
