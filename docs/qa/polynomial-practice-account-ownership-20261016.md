# Polynomial Practice ownership — October 16, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `02082c65f646952929c8a8412fcf7360a81dfb6a`.

## Bounded task and exact scope

The live Practice router uses `audit1-polynomial-practice.js` for A.10A, A.10B, and A.10C, and `audit2-polynomial-practice.js` for A.10D and A.10E. The first runner ignored failed progress responses and had no durable pending queue; the second queued work without an owner and could refresh into a different student's account. Both used server-invalid non-UUID fallback completion ids.

Both runners now use the existing `practice-progress.mjs` helper. A completion report is cached with a UUID-compatible id and original-owner metadata before transmission. Failed/offline/signed-out/switched-account results stay queued for the original student; successful same-owner saves alone remove pending records. One same-owner 401 refresh is allowed. Retry progress save reuses the same report/id, not a new attempt.

The owner is checked before counted-question shortcuts, after usage-response parsing, and around authenticated retries. A.10D–E heartbeat responses are also ignored after an account switch. Save status distinguishes confirmed account sync, durable device queuing, and failure of both account and device storage. First-attempt scoring, hints, explanations, question selection, trial rules, and existing subscriber policies are preserved.

The server remains authoritative: `/api/lesson-progress` verifies the bearer token and derives database ownership from the authenticated user. Browser owner metadata is only a recovery guard; it does not grant access. No RLS, schema, privileged credential, or authentication-policy changes were made.

This closes the remaining five **routed Practice runtime** gaps in #130. A structural regression enumerates all 49 explicit router skills and confirms their runtimes import the owner-safe helper. This is code-path coverage, not proof that 49 complete instructional cycles exist. The generic fallback retains its earlier separate ownership implementation.

## Executed evidence

- `npm run check`: passed, now includes both polynomial runtime assets.
- `git diff --check`: passed.
- New actual-runner cases: **50/50 passed**, ten per polynomial skill; plus **1/1** router coverage regression.
- Focused runner, persistence, ownership, audit, and polynomial lesson/grading set: **110/110 passed**.
- Full branch suite: **718/718 passed**, zero failed/skipped.
- Fresh detached current-main baseline: **490/490 passed**, zero failed/skipped.
- Actual authored banks, the real mathematical grader, persistence helper, and server report normalizer are used in fixtures. Each of the five skills completes five answers and serializes the expected 100%/five-record result. An incorrect first attempt remains incorrect after a correct retry. Existing polynomial answer-key and notation regression checks pass; this is not an exhaustive independent audit of every bank item.
- Recovery cases cover queue-before-request, offline retention, same-id retry, sign-out/account-switch denial, counted-item ownership, one same-owner refresh, repeated 401, refresh into another account, switches during requests/JSON parsing, usage-result ownership, failed device storage messaging, and the visible retry button.
- Isolated local server with dummy public auth configuration and no database, Stripe, or OpenAI credentials: A.10A and A.10E Practice HTML, both modified runtime assets, and shared helper returned 200; JavaScript assets exactly matched local source. Unauthenticated progress POST returned 401. No database writes occurred.
- Supabase current changelog and JavaScript session/refresh documentation checked. Local session identity is not treated as server authentication. No Supabase settings changed.

## Verification boundary and release gates

Story: a polynomial Practice answer becomes a first-attempt score, queues for its original owner, posts to the authenticated progress endpoint, and renders confirmed/queued/failed status with a same-attempt retry.

The tests execute actual runtime code in a DOM/session/storage fixture. Sessions, network responses, and storage failures are simulated. HTTP checks establish serving and unauthenticated rejection, **not** a real authenticated database save, browser rendering, mobile operation, offline reload, or cross-device persistence. No formal review is recorded.

Before approval: complete work offline as student A, sign out and sign in as B and confirm B receives none of A's results, return as A and recover the same completion, repeat with an expired token, then reload on another device. Complete desktop and physical-phone QA without clearing browser data. Stripe sandbox entitlement/lifecycle testing remains a separate release gate.

Remaining development: audit Tutor pending-record ownership; retain old unowned reports until an explicit owner-confirmed recovery flow is available. Storage-failure messaging in earlier generic/Batch/specialized runtimes remains a separate limitation. Do not let draft #103 overwrite the current helper.

No production deploy, merge, student-data deletion/reassignment/reset/migration, database operation, secret, price, payment, entitlement policy, grading rule, curriculum bank, or answer key change was performed.

## Curriculum statement

No instructional cycle was completed. All 49 expectations have authored banks, but a bank or mapped catalog standard is not evidence of complete instruction, practice, mastery assessment, targeted remediation, reassessment, and durable progress. A dedicated completeness audit is required before stating a reliable remaining count.
