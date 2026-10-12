# Practice progress ownership — October 11–12, 2026

Base: main `1cf77ad3179e4b8074200c14df3db25859c7be4a` (PR #129 release).
Branch: `fix/practice-progress-account-ownership`.

## Problem and scope

`public/practice.js` and the Batch 5–9 Practice runtimes wrote pending completion reports without a student owner. The dashboard could post these reports using whichever account next signed in. A student completing Practice offline could therefore have their score attached to a different student on a shared browser. Completion saving also lacked the same-owner 401 retry already used by other flows.

This change binds the generic Practice attempt at its first authenticated interaction, stamps `owner_user_id` on local and pending reports, checks the owner even for previously counted interactions, and retries one 401 only with the original account. Account changes while requests or JSON parsing finish keep the recovery record. The server still derives database ownership from the verified bearer token; local ownership metadata does not grant access.

The October 12 extension routes all 23 Batch 5–9 Practice skills (A.12C–A.12E and A.2A–A.4C) through `public/practice-progress.mjs`. Each completion is stored locally and queued before any network request, receives a UUID-compatible completion id, retries one 401 only for the original student, and clears the recovery record only after a confirmed same-owner response. The student receives an explicit account-saved or device-queued status.

Dashboard replay filters Practice reports to the signed-in owner before applying its 25-record limit and checks the active account before each Practice replay. Other-account and unowned legacy Practice records are kept intact and are not silently assigned to a student. Only confirmed successful saves remove the corresponding pending record.

No production data, authentication settings, entitlements, Stripe configuration, prices, secrets, grading, or curriculum content was changed.

## Executed evidence

- `npm run check`: passed.
- `git diff --check`: passed.
- `node --test test/batch5-lessons.test.mjs test/batch6-lessons.test.mjs test/batch7-graph-visuals.test.mjs test/batch7-lessons.test.mjs test/batch8-attempt-flow.test.mjs test/batch8-lessons.test.mjs test/batch9-lessons.test.mjs test/batch-practice-progress-persistence.test.mjs test/practice-account-ownership.test.mjs test/practice-runtime.test.mjs`: **68/68 passed**.
- `npm test`: **517/517 passed**, zero skipped/failed.
- Fresh detached current-main baseline `npm test`: **490/490 passed**, zero skipped/failed.
- The full suite includes existing Algebra 1 mathematical answer-key and Practice grading validation, including polynomial, radical and Test Prep banks; no mathematical content or grading logic changed.
- Local server, isolated environment, dummy public auth project, no database/Stripe/OpenAI keys: `/practice.html`, `/practice.js`, `/app.js` returned 200; JS bytes matched this branch. Unauthenticated `/api/lesson-progress` POST returned 401. No actual student data or payment request was made.
- Supabase changelog and current JavaScript session/refresh documentation checked. This uses existing `getSession()` / `refreshSession()` APIs; authentication and authorization remain server-verified.

New executable cases cover queue-before-request, same-owner success, one 401 refresh, repeated 401, account switches/sign-out before and after saving, a refresh returning another owner, a switch during response parsing, counted-question access, offline owner replay, legacy preservation, replay-limit fairness, account changes between replays, UUID fallback validity, and structural verification that all 23 Batch 5–9 skills use the owner-safe path. Existing Batch 5–9 lesson, answer-key, visual, help, and attempt-flow checks also pass.

## Required before approval

1. Real-account preview QA: complete generic Practice and one Batch 5–9 skill as student A, interrupt the save, sign out, sign in as B, confirm no A result syncs to B, then sign back in as A and verify dashboard recovery. Repeat with an expired token and a second device. Preserve browser data throughout.
2. Draft PR #103's Batch 5–9 retry behavior is superseded by this owner-safe implementation. Its separate A.10F–A.12B specialized runtime changes remain unmerged and must be reconciled without replacing these guards.
3. Unowned legacy Practice records cannot establish the original student safely. They remain on-device. An explicit owner-confirmed recovery flow is still needed; no records were deleted or automatically reassigned.
4. Specialized Practice runtimes and Tutor lesson pending records require their own ownership audit. Existing non-Practice replay behavior is outside this bounded change. Storage-unavailable/quota UI remains an existing limitation.
5. This is a code/security draft, not real-account browser/mobile or cross-device QA evidence. Preview readiness alone does not prove student persistence.

All 49 standards have authored banks in the repository, but a catalog entry or bank does not establish a complete, verified instructional–practice–mastery–targeted-remediation cycle. This PR adds no completed curriculum expectations; a fresh runtime/completeness audit is still required to state a reliable remaining count.
