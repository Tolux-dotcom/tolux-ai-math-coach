# Isolated Test Prep browser smoke — November 26, 2026

## Scope

Tests-only work on `test/test-prep-browser-recovery-nov26`, continuing draft #134
from `6e741778711b22c56714585e80b043bd5d6c0703` (identical local tree).
Inspected main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`, issues #5/#66,
20 open PRs, current tests and prior draft evidence. Initial harness/workflow commit
was tests-only; executing it found the scoped CSS visibility defect below.

## Added

- `scripts/qa/test-prep-browser-smoke.mjs`: real HTML, runner, progress helper,
  access helper, banks and CSS served from a loopback-only static server. Actual
  clicks complete all ten Quick Check questions and render results. Synthetic
  getSession responses replace the CDN SDK; POST responses are intercepted.
- Six intended cases: desktop 1280x900 and narrow 390x844, each with failed-save
  queue/retry, missing progress helper, and signed-out/device-only completion.
  Assertions cover actual confirm cancel/accept, preserved score/storage on Cancel,
  exact report replay (completion ID, time, answers and score), queue removal after
  mocked success, no confirmation after synced success, no deletion on Continue,
  no page exceptions, and no unexpected external requests.
- `.github/workflows/test-prep-browser-qa.yml`: separate pull-request browser job,
  contents:read only, no persisted checkout credentials, no secrets, ten-minute
  timeout, pinned Playwright 1.62.1 and its matching Chromium. No schedule or deploy.
  App/package dependencies and the existing QA workflow remain unchanged.

## Evidence and limits

- `npm run check`, harness `node --check`, whitespace check passed.
- Initial Node suite **622/622 passed**; fresh main **534/534 passed**.
- Explicit mathematical notation/answer-key/Quick Check checks **7/7 passed**.
- Local browser launch failed: installed `/usr/bin/chromium` is a launcher with a
  missing target executable. Playwright's standard browser installation then
  failed with HTTP 403 Site Unavailable. No network restrictions were changed.
- Therefore **no local browser scenario is claimed passed**. CI browser execution
  and hosted preview status are recorded separately on PR #134 after publishing.
  The browser suite is not part of the existing `npm test` count.
- Browser traffic is limited to loopback static reads, fulfilled synthetic SDK/API
  routes and blocked unexpected external requests. No live auth, Supabase account,
  database, payment, email or customer data is used. A successful mocked POST does
  not prove real backend persistence. Narrow viewport is not physical-phone QA.
- The suite exercises native confirm, not beforeunload/reload behavior. No real
  free/subscriber/expired-token, cross-device or Stripe lifecycle QA is implied.

## Reproduce

The first browser CI run launched Chromium 151.0.7922.34 and failed on the first
desktop queued-retry case after successful sync: Retry remained visually visible
despite its hidden attribute. Shared `.lesson-link-button` display:inline-flex
overrode the browser's default hidden styling. A scoped
`[data-test-prep-retry-save][hidden] { display: none; }` rule now fixes that
without changing other buttons, saving, authorization or scoring. Added a Node CSS
regression; final suite is 623 tests. Browser rerun evidence is recorded on PR #134.

Initial failing browser run:
https://github.com/Tolux-dotcom/tolux-ai-math-coach/actions/runs/45839839458

With Node 22+, install the isolated test dependency without changing package.json:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx --no-install playwright install --with-deps chromium
node scripts/qa/test-prep-browser-smoke.mjs
```

Optionally set CHROMIUM_EXECUTABLE_PATH to an already installed Chromium. The
script has no production URL argument. It closes browser contexts/server in
finally blocks and fails on the first broken scenario.

## Next/release gate

Run and inspect the new browser CI job; fix any harness/integration failures before
claiming coverage. Then verify actual preview sign-in, backend save, sign-out/in,
cross-device history and physical-phone behavior. Stabilization #5's three-pass
student journey and formal review remain required. Draft dependencies unresolved.
No merge, production deployment, billing/secrets/pricing/security-policy change,
student-record mutation, or complete TEKS instruction authored.

Documentation checked: https://playwright.dev/docs/ci-intro,
https://supabase.com/changelog.md and
https://supabase.com/docs/reference/javascript/auth-getsession (November 26).
