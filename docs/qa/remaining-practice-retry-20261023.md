# Remaining Practice retry QA — 2026-10-23

## Scope

This change adds a visible, same-page **Retry Progress Save** action to the six Practice result screens that still lacked one:

- generic Practice
- A.10F
- A.11A
- A.11B
- A.12A
- A.12B

The retry reuses the original in-memory completion report and completion ID. It does not create a second attempt. The result screen reports one of three outcomes truthfully: confirmed on the Tolux account, queued on this device for the original account, or not saved to either location.

## Automated evidence

- Before the source fix, the new regression suite reproduced the gap: **24/37 passed, 13 failed**.
- After the fix, the focused ownership/retry suite passed: **37/37**.
- The affected runtime plus ownership/retry suites passed: **65/65**.
- After hardening the generic binding for the repository's limited fake DOM, the directly affected suite passed: **38/38**.
- Repository suite on this branch: **824/824 passed**.
- Fresh `main` baseline: **490/490 passed**.
- `npm run check`: passed for server and browser JavaScript syntax.
- Isolated local HTTP smoke test: Practice HTML and all six changed JavaScript assets were exact file matches; unauthenticated `GET` and `POST /api/lesson-progress` both returned **401**.

The tests verify that:

- generic and specialized Practice retries reuse the exact original completion ID;
- confirmed saves remove the retry action;
- device-queued saves retain and re-enable it;
- storage-plus-network failure does not claim that progress was saved;
- existing owner binding, account-switch protection, sign-out protection, and one-time 401 refresh behavior remain intact.

## Safety and release boundaries

- Draft/preview only; production is unchanged.
- No Supabase schema, row, authentication setting, environment variable, or secret changed.
- No Stripe, price, Checkout, subscription-entitlement, or billing behavior changed.
- No existing student record or queued local completion is deleted or rewritten.
- This does not reconstruct a Test Prep result that was already missing before the change.
- No curriculum or answer key changed.

## Required manual QA before approval

Using a non-production signed-in student account:

1. Complete generic Practice, one specialized route (A.10F–A.12B), and one Batch 5–9 route.
2. Force the first progress request to fail, verify the result remains visible, then select **Retry Progress Save**.
3. Confirm exactly one account record appears after dashboard reload and on a second device.
4. Repeat with an expired token, an account switch, private/incognito storage, and a phone-sized viewport.
5. Confirm failed storage plus failed network says the result is unsaved and does not claim device recovery.

The repository contains authored banks for all 49 Algebra 1 expectations, but this retry change does not establish that every expectation has a complete instruction, practice, mastery, misconception-diagnosis, remediation, and reassessment cycle. That count still requires a dedicated completeness audit.
