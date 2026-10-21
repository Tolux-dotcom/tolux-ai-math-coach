# Accurate Practice storage status — October 21, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Current main: `9a4fd4efb821047285dea65fe2f73c4f1b42cbe9`.
Prior PR head: `1db02b7123b7109b121b8234a80d296fa688e66f`.

## Bounded task and exact changes

Generic Practice, the five Batch 5–9 runtimes serving 23 routed skills, and the five specialized A.10F–A.12B runtimes previously displayed “saved on this device” for every failed account sync. That statement was false when browser storage rejected the local and pending writes, such as quota, privacy, or storage-access failures.

All 29 affected Practice routes now distinguish three outcomes:

1. confirmed account save;
2. confirmed device queue for the original student, eligible for dashboard replay; or
3. no confirmed account or device save, with an explicit warning to keep the page open and try again.

Generic Practice records whether both local writes succeeded and carries that evidence with its existing sync error. Batch 5–9 and A.12B return the shared helper’s existing `pendingSaved` result; A.10F, A.11A, A.11B, and A.12A render that existing result directly. Successful account saves, original-owner binding, same-owner 401 refresh, queue format, scores, item records, answer keys, grading, and server/database behavior are unchanged.

This is truthful status reporting, not a new persistence transport. It does not restore the previously missing Test Prep score, change Test Prep persistence, provide a new recovery button, or make unavailable browser storage writable.

## Executed evidence

- Before the production-code change, targeted regression tests: **28 passed / 7 failed**. Failures covered generic Practice, Batch route status structure, and all five specialized runtimes.
- `npm run check`: passed.
- Targeted storage-status/ownership tests: **35/35 passed**.
- Focused persistence/runtime/mathematical/readiness/access-policy set: **59/59 passed**.
- Full branch suite: **797/797 passed**, zero failures/skips.
- Fresh detached current-main baseline: **490/490 passed**, zero failures/skips.
- Injected unavailable-storage plus offline-network cases confirm no local keys exist and `pendingSaved` is false. Existing queue-before-request, owner filtering, account-switch protection, same-owner refresh, offline queue, exact-score replay, and successful-save cleanup cases remain passing.
- Structural checks cover generic Practice, all five Batch runtimes mapping 23 skills, and all five specialized runtimes. Existing mathematical answer-key, grading, mastery, remediation/recheck, diagnostic/readiness, and access checks pass. No mathematical content changed; this is not a new exhaustive answer-key audit.

## Verification story and remaining gate

Story: a student finishes Practice → the runtime attempts original-owner local queue and account save → the summary reports only the storage destination that was actually confirmed.

Automated evidence verifies browser-storage and network failure branches in deterministic fixtures. Local and Vercel HTTP checks verify asset delivery and source parity only. They do not prove real browser quota/private-mode behavior, a signed-in Supabase write, offline reload, physical-phone behavior, or cross-device recovery.

Before approving #130, perform the #5 release gate on desktop and a physical phone: complete one generic, one Batch, and one specialized Practice session; verify account-saved status; repeat offline and verify device-queued status; then block storage in a disposable browser profile and verify the explicit unsaved warning. Confirm student B cannot receive or see student A’s result, then return as A and recover the same queued completion. Repeat with an expired token and a second device. Preserve existing browser data.

No production merge/deployment, real student-data mutation, schema/secret/security setting, payment, price, Stripe, or entitlement change. Test Prep recovery, real authenticated Supabase writes, Stripe lifecycle QA, older unowned-result recovery, and a direct retry control for these remaining runtimes are outside this bounded task.

No instructional cycle was completed. All 49 Algebra 1 expectations have authored banks, but banks/catalog mappings do not establish complete instruction, practice, mastery, targeted remediation, reassessment, and persistent progress. A dedicated completeness audit is required for a reliable remaining count.
