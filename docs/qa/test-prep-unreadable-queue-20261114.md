# Preserve unreadable Test Prep queues — November 14, 2026

## Bounded scope

Branch `fix/test-prep-preserve-unreadable-queue-nov14` continues draft #134.
Main `8b186b3`, open issues #5/#66, all open PR heads and prior automation work
were inspected. No conflicting new work or formal review was found.

Previously a failed queue read or malformed/non-array JSON looked like an empty
queue. New completion saves and successful acknowledgements could overwrite
that record. Writes now distinguish an absent key from an unreadable record:
only an absent key is considered an empty queue. Queue insertion/removal return
without writing unreadable storage. The existing public readPending API retains
its array-return contract for display/replay callers.

The separate new device result and direct server save are unchanged. A failed
server save truthfully returns the existing local-only outcome, with instructions
to keep the page open and Retry, rather than falsely claiming account retry was
queued. A successful direct save still reports synced without clearing unrelated
unreadable queue bytes. No schema, SDK, server or authorization change.

## Executed evidence

- Seven regressions failed before implementation: 43/50 persistence tests passed.
- Five malformed/non-array/empty-string queues remain byte-identical after failed
  saves and successful same-attempt retries; new device results remain separate.
- A throwing storage read does not authorize a replacement write.
- Queue data becoming malformed during a successful POST remains untouched by
  acknowledgement. The current result may still correctly report synced.
- Focused persistence/runner 56/56; full branch 569/569; unchanged main 534/534.
  Syntax, diff checks and existing mathematical answer-key validations passed.
- Dummy-config HTTP: Test Prep 200; saver 200 with exact source parity;
  unauthenticated progress GET/POST 401. No real accounts, DB writes or charges.
- See #134 for exact commit, published/tested tree parity, preview and CI evidence.

## Limitations and release gates

Unreadable queues are preserved, not repaired or automatically replayed. The
public readPending/replay interface still displays unreadable queues as empty;
no new repair UI or error taxonomy. No historical scores recovered. Cross-tab
read/write races and browser storage quotas remain separate limitations.

Before approval: authorized real-account desktop/phone QA with malformed storage,
offline/expired sessions, account switching and cross-device history. Coordinate
#130/#137. No main merge, production deployment, student-data deletion, billing,
pricing, auth policy, schema, scoring or curriculum change. No instructional
cycle added.
