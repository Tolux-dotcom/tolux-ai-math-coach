# Dashboard stored-record isolation — October 19, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `e5e380140399bb5222269dff55ce6655fdc12d6f`.

## Bounded task and exact changes

The legacy lesson migration, local lesson-history reader, and pending lesson-progress reader each wrapped the entire scan in one error handler. A malformed JSON value or unreadable key could stop the scan before later valid owned results were found. This was reproduced against the prior tested source: one malformed pending entry followed by one valid owned result returned zero records instead of one.

The three Tutor/Practice scans in `public/app.js` now catch read/parse errors per record, skip null/primitive/array values, and continue inspecting later entries. Unreadable values remain at their original keys unchanged. No browser data is cleared, reconstructed, reassigned, or uploaded merely because it was skipped. Existing ownership filters, confirmed-history handling, 25-owned-record replay limit, same-owner 401 refresh, and successful-save deletion rules are unchanged.

This change does not alter authentication or Supabase/Stripe integration behavior. The Test Prep-specific reader and queue are outside this bounded task and remain unchanged.

## Executed evidence

- Prior-commit reproduction: malformed entry prevented reading the following valid owned result.
- `npm run check`: passed.
- New isolation tests: **15/15 passed** (seven each for Tutor and Practice plus one dashboard integration case).
- Focused storage/replay/runtime/persistence/mathematical-grading/readiness/access-policy set: **115/115 passed**.
- Full branch suite: **783/783 passed**, zero failed/skipped.
- Fresh detached current-main baseline: **490/490 passed**, zero failed/skipped.
- Actual dashboard functions execute with seeded malformed JSON, null/array/primitive values, per-key read exceptions, valid owned records, other-account records, and unowned records. Valid entries after damaged ones remain visible to the owner and eligible for recovery; unreadable/foreign/unowned values stay intact.
- Replay behind a malformed entry preserves the exact valid completion payload, score, and id through a same-owner 401 retry. Success removes only the confirmed valid pending entry; offline failure retains both damaged and valid entries. Damaged or foreign entries do not consume the 25-owned-result limit.
- Actual dashboard refresh/replay/fallback functions confirm that a failed history request can still display the owner's readable local result after valid replay, without clearing unreadable data.
- Server report normalization is exercised in replay fixtures. Existing Tutor mastery, explanation, remediation/recheck, Practice scoring, mathematical answer-key, readiness, and account-ownership tests pass. No grader, answer key, or instructional content changed; this is not a new exhaustive mathematical audit.
- Isolated local server with dummy public auth and no database, Stripe, or OpenAI credentials: dashboard, Tutor, and Practice HTML and changed `app.js` returned 200; `app.js` matched tested source exactly. Unauthenticated progress GET/POST returned 401. No database writes occurred.

## Verification story and boundary

Story: dashboard scans device-saved Tutor/Practice records → skips an unreadable entry without changing it → finds a later original-owner result → replays the unchanged report → confirms account save or shows owner-filtered local fallback.

Tests execute actual browser functions in a storage/session/network fixture. They do not establish physical browser rendering, real authenticated database writes, phone operation, offline reload, or cross-device persistence. Local HTTP checks establish serving and unauthenticated rejection only. Vercel checks establish deployment status and source parity, not signed-in recovery.

Before approving #130, perform the #5 real-account release gate on desktop and a physical phone: A completes offline; B cannot receive or see A's Tutor/Practice fallback; A returns and recovers the same completion; repeat with an expired token and a second device. Keep existing browser data intact. Stripe sandbox lifecycle/customer-entitlement verification and formal review remain outstanding.

## Safety and remaining work

No production deployment or merge. No real student data, database records, schema, secrets, prices, payments, entitlements, security settings, curriculum banks, or answer keys changed. Malformed records are retained, not repaired: unreadable or ownerless old results still require an explicit recovery process. Global storage unavailability cannot be repaired by per-key isolation. Earlier generic/Batch/specialized Practice storage-failure messages and legacy migration write-failure recovery remain separate audits. Draft #103 must not overwrite current owner-safe helper protections.

No instructional cycle was completed. All 49 Algebra 1 expectations have authored banks, but banks or catalog mappings do not establish complete instruction, practice, mastery, targeted remediation, reassessment, and persistent progress. A dedicated completeness audit is required for a reliable remaining count.
