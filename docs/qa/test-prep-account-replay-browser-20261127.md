# Test Prep account/reload recovery browser QA — November 27, 2026

## Scope and inspection

Tests/docs-only continuation of draft PR #134 on local branch
`test/test-prep-account-replay-browser-nov27`, based on published
`9a465d769688c96f44cc557691852bf2f085f4f1` with an identical local tree.
Inspected main `8b186b36dcc74d0261bf4c72355d29e2d7ab0988`, open issues #5/#66,
20 open PRs, current tests and prior browser run evidence. Main and draft heads
were unchanged. No application, dependency or workflow configuration changes.

## Added browser scenario

The existing isolated browser harness now has four cases at each of two viewports
(1280x900 and 390x844), for eight intended scenarios. The new account-replay case:

1. Completes the real ten-question Quick Check with a synthetic original account.
2. Intercepts a failed save and captures the exact queued report and all local
   storage bytes. Cancel on Retake preserves the displayed result.
3. Sets the next synthetic SDK response to signed-out, accepts the actual native
   beforeunload warning and reloads. Explicitly settles a signed-out replay check;
   requires no additional POST and byte-identical stored records.
4. Reloads as a different synthetic account. Settles its empty replay check;
   requires no original-account POST, no reassignment and unchanged storage.
5. Reloads as the original synthetic account with successful intercepted responses.
   Requires one automatic replay of the identical report and only that account's
   acknowledged queue becoming empty. The device result itself remains intact.

This uses real page/module loading, DOM interaction, native dialogs, browser local
storage and reloads, rather than function-only stubs. SDK session values and server
responses remain synthetic. Existing six smoke scenarios remain unchanged.

## Verification evidence

- Local harness syntax, `npm run check` and whitespace checks passed.
- Existing Node suite **623/623 passed**; fresh main worktree **534/534 passed**.
- Explicit mathematical notation/Test Prep answer-key/Quick Check validation
  **7/7 passed**. No scoring, content, answer key or curriculum changes.
- New browser cases must execute in the existing contents:read/no-secrets CI job.
  Actual CI outcome, logs and exact commit are recorded on PR #134 after execution;
  no browser pass is inferred from syntax or the Node suite count.
- Local browser availability remains blocked by a missing executable and the prior
  HTTP 403 browser-download restriction; no further download attempts or restriction
  changes were made. This does not block the already available GitHub browser job.

## Limits and next action

Synthetic sign-out/account changes do not invoke a real Supabase signOut/signIn
flow, validate token revocation or RLS, or prove real backend persistence. The
test preserves one browser context; this is not cross-device history QA. Narrow
viewport is not physical-phone QA. It does not restore the result UI after reload;
it verifies the existing owned queue's integrity and replay only.

No live API/database/payment/customer data is used. External browser requests are
fulfilled with synthetic SDK responses or blocked; app assets are loopback-only.
The earlier workflow remains read-only, pinned and bounded. No merge, deployment
to production, secrets/prices/billing/auth policy changes or student-data mutation.
No complete TEKS instructional cycle authored.

Next: run the new browser CI cases, then actual preview sign-in → complete → backend
saved history → sign-out/in → second device/physical phone, and formal review.
Stabilization issue #5's full three-pass student-journey release gate remains open.

Docs checked: https://supabase.com/changelog.md and
https://supabase.com/docs/reference/javascript/auth-getsession (November 27).
