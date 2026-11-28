# Test Prep missing-saver feedback — November 24, 2026

## Scope

Local branch: `fix/test-prep-missing-saver-feedback-nov24`, continuing draft PR #134
from published commit `a8a51a0f0395d7fe031004d812c9ab5c42a6fb75` (identical local tree).
Inspected current main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`, issues #5/#66,
all 20 open PRs, and prior draft work. Main and draft heads have not advanced since
the previous run. This is a bounded progress-reliability fix under stabilization #5,
not a competing persistence implementation or curriculum expansion.

## Defect and exact change

When `window.toluxTestPrepProgress` is missing (for example a failed helper-script
load), `saveLastResult` returned silently. `persistResult` had hidden Retry, leaving
the displayed score without save feedback or a retry path.

Removed the missing-helper early return. A missing or non-callable `save` now enters
the existing failure handler, which displays the unsaved/keep-page-open message and
exposes Retry. The pending result stays in `lastSaveInput`. Existing no-result,
missing-status-element and in-flight guards are unchanged. No new storage writes,
network calls, account lookup, authorization or scoring behavior was introduced.

## Executed verification

- Before the change, the new missing-helper regression failed: expected unsaved
  feedback, actual empty string. The two malformed-helper cases already passed
  via the existing catch handler; tests retain that coverage.
- Three new executable VM tests run the real runner save/status functions with
  minimal DOM stubs. Missing helper, missing method and non-callable method each
  produce truthful feedback, enabled visible Retry and released in-flight state.
  Repeated unavailable retries preserve the identical input object and values,
  including completion ID/time, score, item records and original account ID.
  Installing a synthetic working helper then retrying saves that same input once
  and shows synced status. No real account or storage is used.
- Focused progress/runner/missing-helper suites: **88/88 passed**.
- Final `npm test`: **614/614 passed**. Fresh main worktree: **534/534 passed**.
- `npm run check`, new test `node --check`, `git diff --check`: passed.
- Explicit mathematical validation: `node --test test/math-notation.test.mjs
  test/test-prep-answer-keys.test.mjs test/staar-quick-check.test.mjs` **7/7 passed**.
  Mathematical content and answer keys were not modified.
- Hosted preview and CI evidence will be recorded on PR #134 after publication.

## Limitations and next step

This is feedback and same-page retry, not a helper-script reloader. If the helper
stays blocked, Retry continues to report failure. With no helper there is no new
durable backup: closing/reloading the page can lose the in-memory result. Existing
stored records and queues are untouched. The tests do not prove real-account
cross-device persistence, real browser script-failure recovery or physical-phone QA.

Before approval, test the preview's missing-helper state and ordinary signed-in
completion/retry, then verify account history after sign-out/sign-in and on another
device. Complete issue #5's desktop/phone student-journey release gate and formal
review. Draft dependencies remain unresolved; this is not production approval.

No merge, production deployment, secrets/pricing/billing changes, customer charges,
authentication weakening or database operations. No instructional cycle authored.
