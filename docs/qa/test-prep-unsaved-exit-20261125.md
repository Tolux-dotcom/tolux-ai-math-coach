# Test Prep unconfirmed-result exit guard — November 25, 2026

## Inspection and scope

Current main: `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`. Inspected issues #5/#66,
all 20 open PRs, prior draft work and current tests. Draft #134 remains at
`37d31d11578d06f1205436630a6b3260a0906f8a` before this change. Local branch:
`fix/test-prep-unsaved-exit-guard-nov25`, based on the identical tested draft tree.
This continues the existing progress-reliability draft rather than duplicating it.

## Defect and fix

Retake or starting another mode cleared `lastSaveInput`, discarding the same-page
retry record even after saving failed. The runner now marks a completed result as
needing protection immediately, before async saving. Only a current result's
confirmed `synced` outcome releases it. Queued/local-only/unknown/error states
remain protected; a stale save response cannot release a newer result's guard.

`startMode` asks for confirmation before replacing an unconfirmed result. Cancel
leaves the result, score, session, status and Retry option unchanged. Continue
discards only this same-page retry context and starts the requested mode. Existing
stored records and retry queues are not removed. A `beforeunload` handler requests
the browser's standard warning while protection is active; confirmed results do
not cancel navigation. Authorization gates remain unchanged.

## Executed evidence

- Before implementation, six of the seven initial tests failed; the already-safe
  confirmed-result start case passed. The failures reproduced cleared retry input,
  missing confirmation/exit handler and absent save-outcome protection updates.
- Eight new tests execute real runner functions in Node VM with minimal DOM,
  synthetic helper responses and confirmation/event stubs. Coverage: cancel all
  three modes, explicit discard, confirmed-result no-prompt, exit warning gating,
  each save-state transition, immediate protection on completion, and a late old
  synced response while a newer result remains pending/queued.
- Focused progress/runner suites: **96/96 passed**.
- Full `npm test`: **622/622 passed**; fresh main worktree: **534/534 passed**.
- `npm run check`, new-test `node --check`, `git diff --check`: passed.
- Explicit mathematical notation/Test Prep answer-key/Quick Check validation:
  **7/7 passed**. No mathematical content, scoring or answer keys changed.
- Safe non-production QA uses synthetic accounts/helper outcomes/DOM only; no
  database, Supabase account, Stripe transaction or production write. Hosted
  preview/source/CI evidence is recorded in PR #134 after publishing.

## Limits and release gates

This warning is not a backup and does not restore an in-progress assessment.
Unconfirmed includes queued results even if a device copy exists, because starting
again removes the displayed result and its direct Retry context. Browser dialogs
may be suppressed, especially on mobile/app termination; browser exit warnings
require prior user interaction and use browser-defined text. A registered unload
listener may also affect browser navigation caching. Native confirm cancellation
defaults to staying on the result; real browser/physical-phone behavior is unverified.

Reference checked: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
(November 25, 2026). Uses preventDefault plus the legacy returnValue fallback.

Before approval, test cancel/continue on Retake and all modes in preview, delayed
and failed saving, successful sync releasing the warning, reload/back/navigation,
and physical phone limitations. Then verify saved history after sign-out/sign-in
and on another device and complete stabilization #5's full-journey release gate.

No merge, production deployment, billing/pricing/secrets changes, authorization
weakening or database operations. Student records/queues remain intact. No complete
TEKS instructional cycle was authored. Draft dependencies/formal review remain.
