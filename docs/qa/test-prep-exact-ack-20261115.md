# Exact Test Prep acknowledgement — November 15, 2026

## Bounded scope

Branch `fix/test-prep-replay-ack-nov15` continues draft #134. Main `8b186b3`,
issues #5/#66, all open PR heads, reviews and prior work were inspected; no
conflicting new work or formal review was found. Source was re-cloned after
workspace maintenance; the published draft remained intact.

Successful direct saves/replay previously removed every queued entry with the
same completion ID, including a changed report written while POST was in flight.
Removal now requires both matching ID and serialized report. A conservative
comparison may retain reordered but equivalent records; it cannot authorize
deletion based only on ID. Only the actual sent report is acknowledged locally.

Replay status is now synced only when every snapshot report was accepted AND
the current queue is readable and empty. Newly queued work, replacement reports,
failed storage writes or unreadable storage keep the summary partial. The synced
count remains the number of accepted snapshot reports. A direct save can still
truthfully report its own result synced while retaining a different queued report.

## Executed evidence

- Five new regressions failed first: 50/55 persistence tests passed before fix.
- Four replay tests: changed same-ID report, new-ID arrival, queue becoming
  unreadable, and acknowledgement write failure. Accepted count is one, summary
  stays partial, and unrelated/replacement data remains intact.
- Direct save test proves a successful reply cannot remove a changed same-ID
  report. No new server request is made for the changed report during this batch.
- Focused persistence/runner 61/61; full branch 574/574; main 534/534.
  Syntax, diff checks and existing mathematical answer-key validations passed.
- Dummy-config HTTP: Test Prep 200; saver 200 with exact source parity;
  unauthenticated progress GET/POST 401. No real accounts, DB writes or charges.
- See #134 for published/tested tree parity, exact commit, preview and CI.

## Limits and release gates

This is a check at acknowledgement time, not atomic cross-tab locking. Writes
between the storage read and write can still race. It does not resolve same-ID
report conflicts server-side, repair queues, or recover historical scores. Existing
server idempotency, ownership, deadlines, capacity limits and scoring unchanged.

Before approval: real-account desktop/physical-phone tests of replay concurrent
with another tab, offline/expired-session recovery, two-account isolation and
cross-device history. Coordinate #130/#137. No main merge, production deployment,
student-data deletion, billing, pricing, auth policy, schema, grading or curriculum
change. No complete instructional cycle added.
