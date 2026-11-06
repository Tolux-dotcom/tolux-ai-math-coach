# Quadratic and exponential Practice ownership — October 15, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `4243036745cc94bd3162db06fb83d50afe49c44b`.

## Bounded task and exact scope

The live router sends A.6A, A.6B, A.6C, A.7A, A.7B, A.7C, A.8A, A.8B, and A.9A to `audit4-structured-practice.js`; A.9B, A.9C, A.9D, and A.9E use `audit5-exponential-practice.js`. These two runners ignored non-success progress responses, lacked pending completion recovery, used server-invalid timestamp fallback completion ids, and did not bind a session to its original account.

Both runners now use the existing `practice-progress.mjs` owner-safe helper, with a cached UUID-compatible completion report stamped with the original owner. They check that account before cached-question access, after usage responses, and around a one-time 401 refresh. Failed, offline, signed-out, and switched-account saves remain pending for their original student. Retry progress save reuses the same completion id rather than recording another attempt. Completion messaging distinguishes confirmed account sync, durable device queuing, and failure of both account and device storage.

The server remains the authentication and authorization authority: its existing progress handler verifies the bearer token and derives database ownership from the authenticated user. Browser owner metadata is a replay guard, never a new authorization rule. No `user_metadata` authorization, public privileged key, RLS change, schema change, or security downgrade was added.

No student data was cleared, reassigned, reset, or migrated. No production deployment, Stripe configuration, price, secret, entitlement rule, trial rule, curriculum bank, math answer key, or grader changed.

## Executed evidence

- `npm run check`: passed, including both newly covered runtime assets.
- `git diff --check`: passed.
- New executable actual-runner cases: **117/117 passed** (nine cases per routed skill).
- Focused runner, ownership, audit, and Practice mathematical checks: **191/191 passed**.
- Full branch suite: **667/667 passed**, zero failed/skipped.
- Fresh detached current-main suite: **490/490 passed**, zero failed/skipped.
- Existing mathematical answer-key and grading checks passed. The new fixtures load the actual authored banks and use the actual structured generator, grader, and persistence helper; every routed skill completes a five-question session and serializes the expected 100% score and five item records.
- Other cases cover queue-before-request, offline retention, same-id retry, sign-out/account switches before saves and counted interactions, one same-owner refresh, repeated 401, refresh returning another student, switches during requests/JSON parsing, usage-result ownership, failed device storage messaging, and the visible retry button.
- Isolated local server with dummy public auth configuration and no database, Stripe, or OpenAI keys: Practice HTML, both changed runtime assets, and shared helper returned 200 with exact source matches. An unauthenticated progress POST returned 401.
- Supabase current changelog and JavaScript session/refresh guidance checked. The October 12 TLS deprecation concerns unsupported legacy clients; no migration of these session APIs is required for this change. No Supabase settings were changed.

## Verification boundary and release gates

Story: a quadratic/exponential Practice answer becomes a first-attempt score, is queued for its original owner, posts to the authenticated progress endpoint, and renders confirmed/queued/failed status with a same-attempt retry action.

The tests execute actual runtime code in a DOM/session/storage fixture; authentication, network responses, and quota failures are simulated. Local HTTP checks verify serving and unauthenticated rejection, not a real database write. They do not establish real-account browser, mobile, offline-reload, or cross-device persistence. No formal review is recorded.

Before approving #130, complete offline work as test student A; sign out and sign in as B, confirm B cannot receive A's result; sign back in as A and recover it; repeat with an expired token and second-device reload. Test desktop and a physical phone without clearing browser data. Independently complete the Stripe sandbox entitlement/lifecycle release gate.

Remaining ownership work: polynomial Practice A.10A–A.10E and Tutor pending records. Older unowned records must stay intact until an explicit owner-confirmed recovery flow exists. Previously changed generic/Batch/specialized runtime storage-failure messaging remains a separate limitation. Draft #103 must not overwrite the current owner-safe helper.

## Curriculum statement

No instructional cycle was completed. All 49 Algebra 1 expectations have authored banks; a bank or mapped catalog entry is not proof of complete instruction, practice, mastery assessment, targeted remediation, reassessment, and durable progress. A dedicated completeness audit is still needed to state a reliable remaining count.
