# Failed handed-off Test Prep result recovery — November 21, 2026

## Bounded scope

Branch `test/test-prep-handoff-failure-retry-nov21` continues draft #134 with
tests/docs only. Main `8b186b3`, open issues #5/#66, all open PR heads, reviews
and prior work inspected. No conflicting new commits or formal review found.

November 20's handoff fix had tests for newer-save success. Four new runner/saver
VM checks cover newer-save failure and recovery after a delayed previous POST.
No runtime change or newly reproduced defect is claimed.

## Executed checks

Matrix: previous POST 200 or 503, with working or blocked storage. While it waits,
a newer Quick Check completion replaces the previous Half Test result. The
subsequent new save returns 503; Retry must remain visible/enabled and bound to
the new completion's ID and original owner, with no false dashboard-saved claim.

Tests verify:
- Exactly two POST attempts before recovery, not a premature parallel save.
- Accurate queued/unsaved message and no stuck saving flag.
- With working storage, the failed new result is queued; a failed older result
  stays queued too. With blocked storage, no queued claim is made.
- Different-account Retry sends no new POST and changes no stored bytes.
- Original-account Retry sends the identical new-result body/token and succeeds.
  A failed older queued result is retained, not cleared with the new result.

New checks 4/4; focused persistence/runner 85/85; full branch 598/598;
fresh unchanged main 534/534. Syntax, diff checks and existing mathematical
answer-key validations passed. No grading/answer-key changes. Exact published
commit/tree, preview parity and CI evidence are recorded in #134.

## Limits and approval gates

Actual runner/saver functions execute with synthetic DOM/session/storage and
responses. This is not rendered browser, authenticated Supabase persistence,
physical-phone or cross-device proof. No real account/database/payment writes.
When storage is blocked, the failed latest result is recoverable only while the
page retains it. This does not recover a superseded failed older result that
could not be stored. Multiple rapid replacement results are still not FIFO queued.

Before approval: authorized real-account desktop/physical-phone retake/mode switch
during slow/offline saves, newer-result failure/Retry, different-account refusal,
and dashboard history after sign-out/in and second-device reload. Coordinate
#130/#137. No formal review, main merge or production deployment. Runtime source,
student records, billing/pricing, auth policy, schema and curriculum unchanged.
No complete instructional cycle added.
