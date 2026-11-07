# Diagnostic save failure QA, October 30, 2026

## Bounded change

Follow-up to draft PR #137, still stacked on PR #130. Missing browser storage
previously passed through an optional call and falsely returned a device-only
save. Storage access is now resolved inside the error guard, and a callable
write API is required before claiming success. Blocked property access, absent
storage, and quota failures all return an unsaved result.

Nine new executable regressions cover missing/null/incomplete/quota-blocked
storage, SecurityError on property access, visible device retry, exact-report
account retry, simultaneous storage/server failure, and student A to B to A
retry isolation. Retry keeps the same completion ID, timestamp, score and owner.

## Evidence

- Syntax: `npm run check` passed.
- Focused diagnostic/access/runtime/ownership set: 52/52 passed.
- Full branch suite: 885/885 passed. Fresh main at `8b186b3`: 534/534 passed.
- Existing mathematical answer-key tests passed; no mathematics changed.
- Diff whitespace check passed.
- Isolated server with dummy public configuration and no privileged Supabase,
  Stripe or OpenAI credentials: diagnostic entry, lesson route, helper HTTP 200;
  served helper matched tested source; unauthenticated history/save HTTP 401.
- An initial full-suite run lacked the local Stripe dependency. Reusing the
  existing installed dependencies resolved the runner setup; both complete
  suites above then passed. No dependency files were changed.

## Remaining gates

Real-account desktop, physical-phone, cross-device, expired-token and offline
recovery QA remains required. Automated DOM harnesses do not establish real
browser end-to-end persistence. PR #137 remains dependent on unmerged PR #130.
Vercel preview authentication previously prevented visual browser QA; do not
disable deployment protection to bypass this gate.

Production, existing student data, secrets, pricing, billing, entitlements and
authentication policy were unchanged. This does not recover an earlier lost
Test Prep score. No instructional cycle was added; authored banks for 49
expectations are not proof of complete instructional coverage.
