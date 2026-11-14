# Test Prep save/replay deadline — November 8, 2026

## Bounded change

Branch `fix/test-prep-progress-timeout-nov08` starts from draft #134 head
`f99a7ca64bdbdbb75ef04c825fba64f83eef12c7`, already based on current main
`8b186b3`. This work does not revive stale #121/#125 or import unrelated #130.

Test Prep's separate saver could wait indefinitely during save or pending replay,
preventing its existing queued/unsaved result and Retry state from returning.
Each POST now has a 15-second transport deadline and AbortSignal. On timeout the
existing save catch returns queued/local-only/unsaved according to actual storage;
flush stops its batch and retains remaining reports. Late replies cannot clear
the pending queue. Explicit retry reuses the original report and completion ID.
The existing single same-owner 401 refresh/retry remains, each HTTP attempt
bounded separately. No automatic timeout retry was introduced.

## Executed evidence

- Regression-first: four new tests failed on untouched transport due to stalled
  saves, **18/22 passed** before implementation.
- Seven new tests: Quick Check/Half/Full timeout and exact-attempt recovery, late
  response isolation, failed-storage truthful unsaved status, bounded 401 retry,
  replay stopping on first stall, retained reports, other-account queue isolation,
  original-owner recovery, and deadline cleanup on successful save.
- Focused persistence/runner tests **31/31 passed**.
- Full branch **544/544 passed**, zero failures/skips (prior #134 had 537).
- Fresh unchanged main **534/534 passed**, zero failures/skips.
- `npm run check`, test syntax and `git diff --check`: passed.
- Existing mathematical answer-key validations passed; no grading, assessment
  bank, answer key or curriculum content changed.
- Dummy-config local HTTP: Test Prep page and assessment-progress.js returned
  200; served script matched source exactly. Unauthenticated progress GET/POST
  returned 401. No privileged Supabase, Stripe or OpenAI credentials or database
  writes were used. Tests accelerate only the 15-second timer inside the VM.

## Known limitations and release gates

This bounds POST transport, not Supabase session lookup/refresh. Multiple
successful requests can extend replay time. This is not an end-to-end 15-second
cap. Response bodies were not consumed by this saver and remain unconsumed;
the existing response.ok success criterion is unchanged. A timeout does not prove
the server did not save, so retaining the original completion ID is essential.

Real-account desktop/phone, slow/offline recovery, expired token, account switch,
sign-out/sign-in and cross-device persistence QA remain required. These VM tests
are not real browser rendering or authenticated database-write evidence. The
other-account test verifies queue isolation, not all mid-flight session races.
Coordinate independent #130/#137 drafts before release. Stripe sandbox lifecycle
QA remains separate. No historical missing score was recovered.

No main merge, production deployment, student-data mutation/deletion, secret,
price, billing, entitlement, schema, auth-policy or usage-limit change. Keep #134
draft pending review. Exact commit, tested tree and preview evidence are in the
PR body. No complete instructional cycle was added; catalog mappings/authored
banks do not establish complete instruction–practice–mastery–remediation coverage.
