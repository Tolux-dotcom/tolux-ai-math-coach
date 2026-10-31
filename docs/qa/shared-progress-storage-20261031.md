# Shared Tutor/Practice storage failure QA, October 31, 2026

## Scope and defect

Bounded follow-up to draft PR #130. The shared `persistPracticeCompletion`
helper previously reported a pending device queue when its optional storage
write was skipped. A browser SecurityError while resolving localStorage also
rejected before the helper's error guards, preventing the authenticated save.

The helper now resolves browser storage inside its guard and requires a callable
write API. If storage is unavailable, it still attempts the server save for the
original owner. It reports an account save only after server confirmation and
never claims a device queue that was not written. Existing records are not
deleted, reassigned, or migrated by this fix.

## Evidence

- New isolated regression suite: 11 tests; 5 failed before the fix, 11/11 pass
  afterward. Covers absent/null/malformed/quota-blocked storage, SecurityError
  on property access, successful and failed account saves, and wrong-owner denial.
- Full PR #130 branch: 879/879 passed, zero skips/failures.
- Fresh current-main `8b186b3`: 534/534 passed.
- `npm run check` and `git diff --check` passed.
- Existing mathematical validation passed; no grading rules or answer keys changed.
- Safe local HTTP with dummy public auth and privileged Supabase, Stripe and
  OpenAI credentials absent: dashboard/Tutor/Practice/helper HTTP 200; served
  helper exactly matched source; unauthenticated progress GET/POST HTTP 401.

## Limitations and integration

No real-account Supabase write, browser privacy-mode, physical-phone, expired
session, or cross-device QA was performed. Those remain release gates together
with review and the separate Stripe sandbox lifecycle tests. The pure helper
tests simulate unavailable storage; they are not physical-browser evidence.

Stacked PR #137 uses this helper without modifying it. Its current preview still
uses the earlier parent until it is synchronized; incorporate this parent fix
and rerun its diagnostic QA before approval. Do not merge stale PR #103 over
the owner-safe helper.

No production deployment, secret, billing, price, entitlement, authentication
policy, database write, or student-data change. No historical missing Test Prep
score was recovered. No instructional cycle was completed; the reliable count
of complete Algebra 1 expectations still requires a dedicated audit.
