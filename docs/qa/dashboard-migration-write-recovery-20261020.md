# Retry-safe legacy lesson migration — October 20, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `4d98d545e2f2b05653912341ed33690ac0ea35d1`.

## Bounded task and exact changes

Review of main, issues #5/#66, open PRs, and #130's earlier QA identified a local migration write-failure gap. Previously, migration wrote a generated completion id to local history before writing its pending report. A failed queue write left history with an id, which the next migration skipped forever. One write failure also aborted the scan before later valid records.

`migrateLegacyLocalLessonProgress()` in `public/app.js` now atomically stages the generated id with a local-only `local_progress_migration_pending: true` marker, writes the unchanged report to the pending queue, and then clears the marker from local history. Each record's writes have their own error handler. A failed staging write leaves the original record intact. A failed queue/finalization write retains the staged id so later runs retry that same completion, including after a reload. The local marker is not included in the queued/network report. Repeated migration cannot create a second completion id for that staged result.

Confirmed server-shaped history, ordinary id-bearing local history, and unowned Tutor/Practice records remain excluded. Original scores, item records, completion time, module, and student-owner metadata are preserved. No owner is inferred. Existing bearer-verified server ownership, owner-filtered replay, 401 refresh, and successful-response rules are unchanged. Test Prep has its own recovery path and is unchanged by this task.

If finalization remains unavailable after a successful replay, a later migration can replay the same id again; it does not create a new id. Tests assert the stable server-normalized `client_completion_id`, not a real authenticated database upsert. Previously stranded id-bearing records without this new marker cannot safely be distinguished from confirmed local history and are deliberately not automatically requeued. Their recovery needs a separate owner-confirmed process.

## Executed evidence

- Before the production-code change, the expanded fixture had **21 passed / 6 failed**: queue-write, finalization-marker, and scan-continuation regressions failed for both Tutor and Practice.
- `npm run check`: passed.
- Storage isolation/migration file: **27/27 passed**, including **12 added** write-recovery cases.
- Focused storage/replay/runtime/persistence/mathematical-grading/readiness/access-policy set: **127/127 passed**.
- Full branch suite: **795/795 passed**, zero failures/skips.
- Fresh detached current-main baseline: **490/490 passed**, zero failures/skips.
- New actual-browser-function fixtures inject staging, pending-queue, and finalization write failures; reconstruct a new runtime from retained storage to simulate reload; verify same-id recovery, unchanged scores/owners, marker exclusion from requests, continued scans, and no mutation of confirmed/unowned records. Existing malformed-record, account-switch, owner filtering, offline, 25-owned-record limit, and 401-retry cases continue passing.
- Existing full-suite mathematical answer-key, grading, mastery, remediation/recheck, diagnostic/readiness, and access tests pass. No question bank, answer key, grader, or instructional content changed. This is regression validation, not a new exhaustive course audit.
- Isolated local HTTP server used only dummy public auth configuration, with no real database, Stripe, or OpenAI credentials. Dashboard, Tutor, Practice, and `/app.js` returned 200; served `app.js` exactly matched tested source. Unauthenticated GET/POST `/api/lesson-progress` returned 401. No database writes occurred.

## Verification story and remaining gate

Story: dashboard finds original-owner legacy Tutor/Practice history → stages one completion id → survives an interrupted local write → reloads and reuses that id → owner-filtered replay posts the preserved report → account response confirms it, or the local record remains recoverable.

Tests exercise actual dashboard functions in deterministic storage/session/network fixtures. HTTP checks verify serving and unauthenticated rejection only. A preview deployment and source-parity check do not establish signed-in browser rendering, real Supabase writes, offline reload, or cross-device persistence. Those require the #5 release gate: student A completes offline, B cannot see/receive A's result, A returns and recovers the same completion; repeat with an expired token, desktop, a physical phone, and a second device. Preserve existing browser data. Formal review and Stripe sandbox lifecycle/customer-entitlement QA remain outstanding.

No production merge/deployment, schema/secret/security change, payment, price, entitlement change, or real student-data mutation. No browser storage is cleared. Malformed/unowned records remain intact; global storage unavailability and old unmarked stranded results need separate recovery work. Earlier generic/Batch/specialized Practice storage-failure messages remain a separate audit. Stale draft #103 must not replace the owner-safe helper.

No instructional cycle was completed. All 49 Algebra 1 expectations have authored banks, but banks/catalog mappings do not establish complete instruction, practice, mastery, targeted remediation, reassessment, and persistent progress. A dedicated completeness audit is required for a reliable remaining count.
