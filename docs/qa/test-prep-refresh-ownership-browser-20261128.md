# Test Prep refresh ownership browser QA — November 28, 2026

## Scope

Tests/docs-only continuation of draft #134 on isolated local branch
`test/test-prep-refresh-ownership-browser-nov28`. Based on published
`bb33c9163e3915f37ff919108b0b7af42c38904a` and its identical local tree.
Inspected main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`, open issues #5/#66,
all 20 open PRs, existing tests and prior browser evidence; heads unchanged.
No application, dependency, workflow or authorization-policy changes.

## Added checks

The isolated Chromium harness has two additional cases at each of 1280x900 and
390x844, extending eight intended cases to twelve. Each completes the real
ten-question Quick Check and first receives a synthetic 503, retaining its result
and queue. Manual Retry then receives a synthetic 401:

- **Same owner after refresh:** exactly one synthetic refresh changes the token,
  the actual progress helper sends the identical report again, mocked success
  empties the owned queue, UI shows synced, Retry hides and Retake no longer warns.
  All three report bodies (initial failure, expired retry, refreshed retry) must
  match, including completion ID/time, score and item records.
- **Different owner after refresh:** exactly one refresh changes owner; there must
  be no subsequent POST under that account, no synced message and no storage-byte
  change. Retry remains visible; another click must show original-account-required
  feedback without further POST/refresh or changing stored work/displayed score.

The synthetic SDK now models mutable current-session state and refresh-count
observability. The request interceptor rejects unexpected authorization identities.
All previous guest, missing-helper, retry, reload and account-isolation cases remain.

## Executed local checks and CI gate

- Harness syntax, `npm run check`, whitespace check passed.
- Existing Node suite **623/623 passed**; fresh main **534/534 passed**.
- Explicit notation/Test Prep answer-key/Quick Check validation **7/7 passed**.
  No mathematical scoring/content/key or curriculum changes.
- Browser execution must pass the existing read-only/no-secrets CI job. Exact
  executed outcome/logs and preview status are recorded on PR #134 after the run;
  syntax and Node counts are not browser evidence.
- Local browser remains unavailable under the earlier missing executable/download
  restriction. No repeat download or restriction changes attempted.

## Safety, limits and next task

These tests serve real page/assets/helpers over loopback and use synthetic session
values and intercepted server responses. They do not call actual Supabase auth,
exercise real refresh-token rotation/revocation/RLS, or prove backend persistence.
Narrow viewport is not physical-phone QA, and same-context storage is not a
cross-device test. No real account, customer, Stripe transaction or database write.

Next: real preview expired-token completion/retry and account-switch rejection,
backend saved history after sign-out/in and a second device/physical phone, then
issue #5's three-pass full-journey release gate and formal review. Other draft
dependencies remain unresolved. No merge, production deployment, secrets/pricing/
billing/security-policy changes, data mutation or complete TEKS instruction authored.

Docs checked November 28: https://supabase.com/changelog.md and
https://supabase.com/docs/reference/javascript/auth-refreshsession.
