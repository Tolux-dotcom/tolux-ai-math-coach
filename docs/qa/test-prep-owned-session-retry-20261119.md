# Owned Test Prep retry account-check errors — November 19, 2026

## Scope

Branch `fix/test-prep-owned-session-retry-nov19` continues draft #134. Main
`8b186b3`, open issues #5/#66, all open PR heads, reviews and prior work checked.
No conflicting new commits or formal review found.

After a result acquired an original owner, a getSession timeout/error on Retry
was previously reported as a need to sign back into that account. That failure
does not prove sign-out. Such errors now return session-unavailable while
retaining originalOwnerId, before any storage read/write or save POST.

The UI says it could not check the account, existing result unchanged, keep the
page open and Retry when connected. It does not invent a device-save status:
the existing report may be queued, local-only or only in memory. Confirmed null
or different-owner sessions still require the original account. Server auth,
owner checks around POST, refresh and first-save behavior remain unchanged.

## Executed evidence

- Six regressions failed first: 66/72 persistence tests passed before fix.
- Timeout, SDK error result and rejected lookup, each with working/blocked
  storage, run actual runner/saver functions in VM with synthetic dependencies.
- Verify truthful message, enabled/visible Retry, unchanged report/owner and
  storage bytes, no extra POST, and no late-response write/save.
- After checks recover, another account remains blocked without storage changes;
  original account resends byte-identical body with its own token and succeeds.
- Focused persistence/runner 78/78; full branch 591/591; main 534/534. Syntax,
  diff checks and existing mathematical answer-key validations passed.
- Dummy-config HTTP: page and both scripts 200, scripts source-identical;
  unauthenticated progress GET/POST 401. No real accounts, DB writes or charges.
- Supabase current changelog/getSession docs and security checklist reviewed:
  https://supabase.com/changelog.md
  https://supabase.com/docs/reference/javascript/auth-getsession
  No SDK/config upgrade, privileged keys, metadata-based authorization, RLS,
  schema or server-policy change. Exact commit/preview/CI recorded in #134.

## Limits / gates

This corrects same-page known-owner retry outcomes, not whole-assessment account
binding, SDK cancellation, malformed-data repair, cross-tab locking or historical
score recovery. Keep the result page open, especially when storage is blocked.
VM tests are not authenticated Supabase integration or rendered browser proof.

Before approval: authorized real-account desktop/physical-phone checks for owned
result -> failed account lookup -> Retry -> original-account recovery -> dashboard
-> sign-out/in -> second-device history; include a different-account refusal.
Coordinate #130/#137. No main merge, production deployment, billing/prices,
auth-policy, student-data deletion, scoring or curriculum change. No instructional
cycle added.
