# A.5A–A.5C Practice ownership and recovery — October 14, 2026

Branch: `fix/practice-progress-account-ownership`, draft PR #130.
Base: current main `1cf77ad3179e4b8074200c14df3db25859c7be4a`.
Prior PR head: `717b25fadb7ada7d6f1fdce21f321a508e9db9fe`.

## Bounded change

The live Practice router sends A.5A/A.5B to `audit3-a5-practice.js` and A.5C to `audit4-a5c-practice.js`, not the generic runtime. These two runners still lacked durable pending saves, ignored unsuccessful progress responses, and could use a later signed-in account for earlier work.

Both runners now bind to the first authenticated account, check that account before cached-question shortcuts and after access responses, refresh a 401 at most once for that same account, and send progress through the existing owner-safe `practice-progress.mjs` helper. The completion report is cached with a UUID-compatible id, so retries preserve the same attempt. Local/pending reports include `owner_user_id`; actual database ownership still comes from the server-verified bearer token, not the browser field.

The completion UI distinguishes confirmed account saving, durable device queuing, and failure of both account and device saving. An unsuccessful save exposes a Retry progress save button that reuses the report. No student data was deleted, reassigned, reset, or migrated. No server authorization, trial policy, Stripe lifecycle, price, secret, Supabase setting, curriculum bank, or grading rule changed.

## Executed evidence

- `npm run check` and `git diff --check`: passed. Both audited runtime files now participate in syntax checks.
- New executable runner cases: **27/27 passed** across A.5A, A.5B, and A.5C.
- Focused runner/ownership/audit/mathematics set: **73/73 passed**.
- Full branch suite: **550/550 passed**, zero failed/skipped.
- Fresh detached main suite: **490/490 passed**, zero failed/skipped.
- Existing Algebra 1 answer-key/grading validations passed; no mathematics was rewritten.
- The runner tests execute the actual browser scripts in a DOM/session/storage fixture with the real Practice generator, grader, and persistence helper. They exercise five-question completion and 100% score serialization, queue-before-request, offline retention, same-id retry, signed-out/account-switch denial, counted-question denial, one same-owner refresh, repeated 401, refresh to another account, switches during requests/JSON parsing, access-result ownership, storage failure messaging, and the visible retry action.
- Isolated local server with a dummy public Supabase configuration and no database/Stripe/OpenAI keys: Practice HTML, both modified runtime assets, and the helper returned 200 and exactly matched source. Unauthenticated progress POST returned 401.
- Supabase current session/refresh documentation and changelog reviewed. No auth API migration required for these browser APIs. `getSession()` is only used to select the client token/owner; the server validates authentication independently.

## Verification boundary and remaining gates

The verified story is Practice answer → first-attempt score → original-owner local queue → authenticated request contract → response status/retry rendering. The sessions, network responses, and storage failures in the new tests are simulated. The HTTP check verifies actual asset serving and unauthenticated rejection, not a real student database write.

Before approving #130, use two real preview test accounts: student A completes offline, signs out, student B must not receive A's score, student A signs back in and recovers it, then verify an expired-token save and second-device reload. Repeat on desktop and physical phone, without clearing browser data. No formal review is recorded.

Separate audits remain for A.6A–A.9E structured/exponential runners, polynomial Practice runners, Tutor pending-record ownership, and storage-failure messaging in previously changed runtimes. Older unowned records remain intact; do not infer their owner. Draft #103 must not overwrite #130's owner-safe helper. Real Stripe sandbox lifecycle and payment entitlement QA remain separate gates.

This is a persistence/security fix, not completed instruction. All 49 standards have authored banks; complete instruction, practice, mastery, targeted remediation, reassessment, and persistent progress still require a dedicated coverage audit. No new completed-expectation count is claimed.
