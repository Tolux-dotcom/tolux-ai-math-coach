# Test Prep recovery UI verification — November 17, 2026

## Bounded task

Branch `test/test-prep-recovery-ui-nov17` continues draft #134 with tests only.
Main `8b186b3`, issues #5/#66, open PR heads and prior work were inspected.
No conflicting new commits or formal review were found.

Saver-level safeguards had coverage, but their combined runner-visible recovery
needed executable checks. Four tests now run the actual saveLastResult/message
functions with the actual assessment-progress saver in a VM, with synthetic
DOM state, account sessions, storage and responses. No runtime code changed.

## New executed evidence

Cases: full 20-report queue; malformed queue; stalled pre-POST owner session
check; stalled 401 refresh. Production 15-second timers are accelerated to 10ms
in the fixture; the tests themselves have a 250ms completion guard.

For each case the UI exits saving, leaves Retry visible/enabled and avoids a
false account-saved claim. Full/malformed queues receive the existing explicit
device-only/could-not-queue message, with original queue bytes untouched.
Restored connectivity plus same-page Retry sends exactly the retained report,
preserving completion ID, timestamp and original owner; success hides Retry and
shows the account-saved message. Preserved full/malformed queues remain intact.

- New tests 4/4; focused runner/persistence 65/65; full branch 578/578.
- Fresh unchanged main 534/534. Syntax, diff checks and existing mathematical
  validations passed; no answer keys or scoring changed.
- No regression failure is claimed: these checks passed existing runtime code.
- Preview/CI evidence and exact commit are recorded in #134.

## Limits / next approval gate

This is executable VM integration, not browser rendering, real Supabase or
authenticated server persistence. No real account/database/payment writes.
The tests check save-message state and Retry availability, not a physical click,
accessibility, cross-device history or Stripe entitlement.

Before release: authorized real-account desktop/physical-phone checks through
result -> failed save -> visible Retry -> restored connection -> dashboard ->
sign-out/in -> second-device history. Include two accounts and concurrent tabs;
coordinate #130/#137. Initial session-lookup timeout, whole-test account binding,
atomic storage locking, malformed-data repair and historical score recovery are
not added by this task. No formal review, main merge or production deployment.
Billing, auth policy, student records, runtime source, schema and curriculum
unchanged. No complete instructional cycle added.
