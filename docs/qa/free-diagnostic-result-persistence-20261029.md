# Free diagnostic result and persistence QA — 2026-10-29

## Scope

This stacked draft adds a result boundary to the existing two-question public
Algebra readiness diagnostic. It does not change pricing, Stripe, subscriber
entitlement, lesson usage limits, or production configuration.

The public readiness landing page now opens the actual A.5A diagnostic. After
the two authored questions, students see their first-attempt score and the
specific prerequisite areas to review before choosing whether to continue into
the lesson.

Signed-in results use the owner-bound progress path from draft PR #130.
Signed-out results remain local to that browser and are deliberately not queued
for a later account. Dashboard fallback filtering prevents an unowned result
from appearing after a different student signs in.

## Automated evidence

- `npm run check`: PASS, including the new diagnostic progress module.
- Focused diagnostic/access/runtime/ownership tests: 43/43 PASS.
- Full repository suite: 876/876 PASS.
- `git diff --check`: PASS.
- Mathematical validation: the full suite revalidated the current Algebra 1
  lesson and Test Prep answer banks. No question or answer key changed here.

## Safe local HTTP QA

The server was started with dummy public Supabase configuration and with
privileged Supabase, Stripe, and OpenAI credentials absent.

- readiness landing page: HTTP 200
- diagnostic lesson route: HTTP 200
- diagnostic progress module, lesson runtime, and dashboard runtime: HTTP 200
- served diagnostic and lesson source matched the working-tree files
- unauthenticated lesson-progress GET and POST: HTTP 401

No production services, secrets, payments, prices, or database rows were
changed.

## Limitations and required preview QA

- This branch depends on PR #130's owner-bound progress helper and must remain
  stacked until #130 is approved or merged.
- Real signed-in and signed-out browser QA is still required on desktop and
  phone.
- A signed-in test must confirm the result survives sign-out/sign-in and a
  second device. A signed-out test must confirm the result remains device-only
  and never appears under a later account.
- Offline/expired-session retry should be exercised with a real test account.
- This change adds no new instructional cycle. All 49 Algebra 1 expectations
  have authored banks, but a dedicated audit is still required before claiming
  how many have complete instruction, practice, mastery assessment, targeted
  remediation, reassessment, and persistent progress.
