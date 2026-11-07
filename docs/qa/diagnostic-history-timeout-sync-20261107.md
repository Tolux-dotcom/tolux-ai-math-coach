# Diagnostic history integration — November 7, 2026

## Bounded task

Branch `fix/diagnostic-history-timeout-sync-nov07` reconciles draft #137 with
PR #130 head `f091c9fb6e21f502abd3886e81b07d589ff42119`. The conflict-free
integration brings the 15-second account-history HTTP/body deadline into the
diagnostic preview, retaining child-specific readiness labels and owner filters.
This adds no new production behavior beyond the inherited parent change.

Two diagnostic-specific integration tests construct real report shapes with one
first miss later corrected and one first-attempt correct response. For stalled
GET and stalled JSON independently, the dashboard returns local fallback with
50% first-attempt evidence and a truthful temporarily-unavailable status. Tests
verify abort, unchanged stored bytes, no late-response replacement, no fallback
exposure to another account, and recovery of the same completion/score when the
original owner returns. VM-parsed JSON is compared by data, not realm prototype.

## Executed evidence

- Focused dashboard, ownership, storage, Test Prep, diagnostic, lesson-runtime
  and timeout tests: **158/158 passed**.
- Full integrated branch: **920/920 passed**, zero failures/skips.
- Fresh unchanged main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`:
  **534/534 passed**, zero failures/skips.
- `npm run check`, test syntax and `git diff --check`: passed.
- Existing mathematical answer-key and runtime validations passed. No bank,
  grading, answer-key or instructional-content changes.
- Dummy-config local HTTP: dashboard, readiness landing and diagnostic route
  returned 200. Four assets (app.js, lesson.js, practice-progress.mjs and
  diagnostic-progress.mjs) returned 200 and matched tested source exactly.
  Unauthenticated progress GET/POST returned 401. No privileged Supabase,
  Stripe or OpenAI credentials, real accounts or database writes were used.

## Remaining release gates

Keep #137 draft and stacked on unmerged #130. Retarget/retest after approved
parent merge. Exact published commit/tree and preview evidence are in the PR
body. Real-account desktop/physical-phone, privacy mode, expired-session,
account-switch, slow/offline and cross-device QA remain required. VM rendering
is stubbed; source parity and mocked requests do not prove real database writes
or correct visual browser behavior. Existing display-label tests remain intact.

Supabase session reads/refreshes and Test Prep's separate flush remain outside
the HTTP deadlines. Replaying multiple successful requests can extend loading
time; there is no end-to-end 15-second cap. No historical missing result was
reconstructed. Stripe sandbox lifecycle testing remains separate.

No merge to main, production deployment, student-data mutation/deletion, secret,
price, billing, entitlement, schema, usage-limit or authentication-policy change.
No complete instructional cycle was added; catalog mappings/authored banks are
not proof of complete instruction–practice–mastery–remediation–reassessment
coverage. A dedicated audit is still required for a reliable remaining count.
