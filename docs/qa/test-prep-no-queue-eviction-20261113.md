# Preserve full Test Prep queues — November 13, 2026

## Scope

Branch `fix/test-prep-no-queue-eviction-nov13` continues draft #134.
Main `8b186b3`, open issues #5/#66, all open PR heads and prior #134 work
were inspected. No conflicting new work or formal review was found.

Previously every queue insertion used `slice(-20)`, silently evicting older
unsynchronized reports. Now a new completion is refused when the owner's queue
already has at least 20 entries. The existing queue is not written or trimmed.
Retrying a completion already in that queue remains allowed without trimming
other entries, including an oversized pre-existing queue.

The save still tries the server. If it fails, the existing local-only outcome
truthfully says automatic account retry could not be queued, and instructs the
learner to keep the page open and Retry. The separate device result is retained
when storage succeeds. No new UI, server authorization, schema or SDK behavior.

## Executed checks

- Three regressions failed before the fix: 40/43 persistence tests passed.
- Full queues with 20 and 23 entries are byte-identical after failed new saves;
  the new result is stored separately, not falsely called queued. Another owner's
  queue is unchanged. After replay drains older work, the exact new report/ID
  can be retried successfully.
- A retry of an existing entry in a 23-report queue preserves all 22 unrelated
  reports rather than truncating them.
- Focused persistence/runner: 49/49; full branch: 562/562; unchanged main:
  534/534. Syntax, diff checks and existing mathematical validations passed.
- Dummy-config HTTP: saver 200 with exact source parity; Test Prep 200;
  unauthenticated progress GET/POST 401. No real accounts, DB writes or charges.
- See #134 for the exact published commit, CI and preview verification.

## Limits / release gates

No evicted historical reports were recovered. This does not repair a malformed
JSON queue or eliminate cross-tab localStorage races. A full queue is not expanded
without limit. New device-only results are not automatically account-owned or
replayed; keep the result page open for same-attempt Retry after older work syncs.
Storage-quota failure remains possible; existing unsaved/local-only outcomes apply.

Before approval: authorized real-account desktop and physical-phone checks with
a full queue, offline recovery, two-account isolation and cross-device history.
Coordinate #130/#137 before release. No formal review, main merge, production
deployment, student-data deletion, billing/pricing, auth-policy, schema, scoring
or curriculum change. No complete instructional cycle added.
