# Test Prep sync session checks — November 10, 2026

Draft #134 previously checked the owner for manual retries, but a replay batch
could continue using the token it captured before an account switch or refresh.
A response could also clear queued work after sign-out, or a stale 401 could
trigger a refresh after the original account was no longer active.

The shared POST path now checks the current session for the original owner
before each send and again before acknowledging the response or refreshing.
The existing one-time 401 retry checks both the refresh result and the active
session. Each later replay item uses the current token for the same owner.
If the session no longer matches, the existing failure path retains the
report and stops replay. Report bytes and completion IDs do not change.

## Evidence

- Four new regressions failed before implementation (27/31 persistence
  tests passed): account switch on response, sign-out before 401 refresh,
  stale same-owner refresh result, and stale token on a later replay item.
- Focused runner/persistence 37/37; full branch 550/550; unchanged main
  `8b186b3` 534/534. Syntax, diff and existing mathematical validations passed.
- Local dummy-config HTTP: Test Prep 200, saver exactly matched tested
  source, unauthenticated progress GET/POST 401. No real database or charges.

## Release gates

This is a client-side checkpoint, not cancellation of a POST already accepted
by the server. Retained reports retry with their original ID. Session lookups
and refresh remain outside the 15-second POST timeout. Real-account preview
QA with two authorized test accounts, desktop/phone, expired sessions and
cross-device history is still required. Coordinate #130/#137 before release.

No main merge, production deployment, server authorization, entitlements,
pricing, Stripe, schema, student data, scoring or curriculum changes. No
instructional cycle added. Exact tested commit and preview are on draft #134.
