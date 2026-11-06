# Tutor progress ownership — October 17, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `7af6daf899e8a9c9baa5c99f5d734569e211313a`.

## Bounded task and exact changes

The shared Tutor runtime in `public/lesson.js` queued completions without an owner and could refresh into another account. Dashboard replay previously protected Practice reports only; Tutor reports could be sent under whichever account opened the dashboard next. Device-only lesson history also lacked ownership filtering.

- Bind Tutor at its first authenticated interaction and retain that owner for the lesson. Check ownership before counted-item shortcuts, after access responses, around a one-time 401 refresh, and after heartbeat responses.
- Stamp the cached completion report with `owner_user_id`. Reuse the existing owner-safe persistence helper and the same completion id for retries. Queue before transmission, retain unsuccessful saves, and clear recovery only after a confirmed same-owner success.
- Add Retry progress save and distinguish confirmed account save, durable device queue, and failure of both account/device storage.
- Extend dashboard ownership checks to `alg1-*` Tutor reports as well as Practice. Read the current same-owner token before each replay; require an activity response and recheck ownership after parsing before clearing a pending record.
- Filter Tutor/Practice local fallback history to the confirmed signed-in owner. Signed-out, switched-account, or unavailable-auth fallback does not display those records. This withholds unconfirmed activity rather than deleting it.
- Preserve unowned legacy Tutor/Practice records byte-for-byte during migration/replay. No owner is inferred. Server-shaped confirmed history with `client_completion_id` is not migrated into a duplicate completion.
- Preserve anonymous readiness access for exactly A5A-D01 and A5A-D02 in the A.5A diagnostic stage. No synthetic diagnostic session becomes a lesson owner; the server must explicitly return `allowed` and `isFreeDiagnostic`. A previously bound lesson cannot use the anonymous path after an account switch.
- Update the existing Tutor runtime fixture to represent real Supabase sessions with a user id. Add executable ownership, recovery, fallback, and anonymous-diagnostic regressions.

Server-verified bearer authentication and server-derived database ownership remain authoritative. Local owner metadata is a recovery/display guard, never an authorization grant. No `user_metadata` authorization, public privileged key, RLS, schema, entitlement, trial policy, or account-security change was added.

## Executed evidence

- `npm run check`: passed for the final source.
- New Tutor/dashboard tests: **24/24 passed**.
- Focused Tutor/Practice persistence, runtime, mathematical grading, readiness, and access-policy set: **74/74 passed**.
- Full branch suite: **742/742 passed**, zero failed/skipped.
- Fresh detached current-main baseline: **490/490 passed**, zero failed/skipped.
- The new fixture executes the actual Tutor runtime, actual A.5A mastery bank, real grader, persistence helper, and server report normalizer. Five correct mastery responses produce an owned, server-valid 100% report with five item records. Existing whole-lesson, explanation-grading, remediation/recheck, and mathematical answer-key tests pass. This is not an exhaustive independent audit of every Algebra 1 item.
- Recovery cases cover queue-before-request, offline retry, original completion-id reuse, sign-out/account switching, counted interactions, same-owner 401 refresh, repeated 401, refresh into another student, changes during requests/JSON parsing, unavailable storage, visible retry, and ownerless completion retention.
- Dashboard tests cover old unowned records unchanged, original-owner replay, filtering before the 25-record limit, current-token use, malformed-success retention, account switches during replay/parsing, confirmed-history duplicate prevention, and owner-filtered local fallback during history failures.
- Anonymous/bridged readiness tests cover both server-approved public items, denial of other items, explicit server confirmation, and denial of anonymous fallback after an owner is bound.
- Isolated local server with dummy public auth configuration and no database, Stripe, or OpenAI credentials: Tutor/diagnostic HTML, `lesson.js`, `app.js`, and the shared helper returned 200; JavaScript assets matched tested source exactly. Anonymous A5A-D01 and A5A-D02 usage calls returned explicit free-diagnostic grants; unauthenticated progress POST returned 401.
- Supabase current changelog and JavaScript session/refresh guidance checked. Local session identity is not treated as server authentication. No configuration changes were made.

## Verification boundary

Story: a Tutor answer is graded, becomes an original-owner mastery report, is queued before the authenticated save, and renders confirmed/queued/failed status. Dashboard replay can recover it only for that owner; local fallback does not present another student's Tutor/Practice activity.

Actual browser scripts execute in a DOM/session/storage fixture. Sessions, network responses, and quota failures are simulated. Local HTTP checks prove serving, public diagnostic access, and unauthenticated save rejection, **not** real signed-in browser rendering or an authenticated database write. Real-account phone, offline-reload, and cross-device checks remain unverified. No formal review is recorded.

## Safety and remaining work

No production deployment or merge. No student data was deleted, reset, reassigned, or migrated in a live system. No database operation, secret, price, payment, entitlement rule, grader, answer key, or curriculum bank changed. Test Prep's separate owner-keyed queue and device-only panel are unchanged.

Before approval, use two authorized test accounts without clearing browser data: student A completes Tutor/Practice offline; student B cannot receive or see A's Tutor/Practice fallback result; A returns and recovers the same completion; repeat with an expired token and a second-device reload. Verify new and existing accounts on desktop and a physical phone. Stripe sandbox lifecycle/customer-entitlement QA remains a separate release gate.

Old unowned results require an explicit owner-confirmed recovery workflow and remain intact. Earlier generic/Batch/specialized Practice storage-failure messaging remains separate work. Dashboard replay retains a rejected 401 result for a later attempt; its own explicit same-owner refresh is not added in this task. Draft #103 must not overwrite current owner-safe helper protections.

No instructional cycle was completed. All 49 expectations have authored banks, but a bank or catalog mapping does not establish complete instruction, practice, mastery assessment, targeted remediation, reassessment, and durable progress. A dedicated completeness audit is still required for a reliable remaining count.
