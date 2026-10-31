# PR #130 current-main synchronization — October 28, 2026

## Scope

Draft PR #130 was synchronized from prior head
`3052c2d27643ce780980b82fd3b4dbc83555cc3e` with current `main`
`8b186b36dcc74d0261bf4c72355d29e2d7ab0988`.

The merge was conflict-free. It retains the released Physics course, administrator
learning access, and current Test Prep entitlement changes while preserving #130's
original-owner Tutor/Practice progress queue, account-switch guards, same-owner
401 refresh, storage recovery, and same-attempt retry controls. The PR diff remains
limited to #130's progress implementation, tests, and QA records; no production
deployment, database write, schema, secret, price, payment, Stripe, entitlement,
curriculum bank, answer key, or grading rule changed.

Two trailing blank lines already present in the draft were removed so the synchronized
diff passes `git diff --check`. No executable behavior changed in that cleanup.

## Executed evidence

- Current `main` baseline: **534/534 passed**, zero failures/skips.
- Synchronized PR focused ownership/retry suite: **341/341 passed**.
- Synchronized PR full repository suite: **868/868 passed**, zero failures/skips.
- `npm run check`: passed.
- `git diff --check`: passed after the whitespace-only cleanup.
- Isolated local server used a dummy public Supabase configuration with all privileged
  Supabase, Stripe, webhook, and OpenAI credentials removed.
- Dashboard, Tutor, Practice, the shared persistence helper, and all changed Practice
  runtime assets returned HTTP 200 and exactly matched the tested local source.
- Unauthenticated GET and POST requests to `/api/lesson-progress` both returned 401.
- No real account, production service, or student database was used.

## Remaining release gates

Keep #130 draft until two disposable preview students prove that student A's interrupted
or offline completion cannot be attributed to student B, and that student A can recover
the same completion after signing back in. Repeat with an expired token, reload, second
device, desktop, and a physical phone without clearing browser data. Confirm exactly one
activity after replay. Formal review and the separate Stripe sandbox lifecycle/customer
entitlement gate remain outstanding.

This synchronization changes no instructional content. Authored banks exist for all 49
Algebra 1 expectations, but that does not establish complete instruction, practice,
mastery assessment, misconception diagnosis, targeted remediation, reassessment, and
persistent progress. A dedicated completeness audit is still required before claiming a
reliable completed- or remaining-expectation count.
