# Billing ownership migration QA

This verification uses a temporary in-memory Postgres engine and fake users. It never connects to Supabase or Stripe, does not copy student data, and does not change application dependencies.

Install the pinned QA-only dependency outside the repository and run:

```sh
npm install --prefix /tmp/tolux-billing-db-qa @electric-sql/pglite@0.5.8 --ignore-scripts --save-exact
TOLUX_QA_PGLITE_MODULE=file:///tmp/tolux-billing-db-qa/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-billing-ownership.mjs
```

The script applies the actual migration with Supabase-like broad default service-role grants, exercises role permissions, checks ownership uniqueness and foreign keys, replays an upsert, reapplies the migration, and compares score, entitlement, and trial fixtures before and after. It verifies the service role retains only SELECT, INSERT, and UPDATE, with both DELETE and TRUNCATE denied.

Passing proves the migration behaves correctly in this isolated Postgres environment. It does not verify Supabase Auth, Data API exposure, deployed preview configuration, or Stripe webhook persistence. Those remain staging release checks.

For staging, create a data-less branch, verify its project reference differs from production, apply `supabase/migrations/202610070001_create_stripe_billing_ownership.sql`, and verify table RLS and grants. Do not merge the database branch or deploy production as part of QA. Approve the displayed branch cost before creating billable infrastructure.

## Hosted staging verification, October 10, 2026

The owner approved a disposable data-less Supabase branch and a $1 testing budget. Branch `qa-pr129-billing-20261010` used project `rmtdqxeooobojiragtld`, separate from production `xnadszfvjkyxltskywin`, with `with_data=false` and zero Auth users.

Hosted Postgres exposed a default-grant discrepancy the initial local fixture did not model: service_role inherited REFERENCES, TRIGGER, and TRUNCATE in addition to the intended operations. The migration now revokes all service-role privileges on this new table before granting only SELECT, INSERT, and UPDATE. It was reapplied successfully in staging, and the local harness now reproduces those default grants.

`scripts/verify-billing-ownership-staging.sql` passed seven hosted check groups: RLS/exact grants, anonymous read/write denial, authenticated read/write denial, service insert/read/update/idempotent replay, destructive-operation denial, cross-user ownership uniqueness, and foreign-key/Stripe-ID validation. Its transaction rolled back all fixtures; follow-up counts were zero Auth users and zero billing rows. Security Advisor reported only informational RLS-without-policy notices for the server-only billing table and three existing branch tables. No client policies were added.

The branch's older migration replay reported `MIGRATIONS_FAILED`, leaving only skill_attempts, skill_mastery, and student_trial_access before this migration. This limited branch proves billing-table SQL behavior, not a full application/entitlement/score integration. The workflow log UI supplied no detailed error beyond that status. Fix reproducible staging schema replay before authenticated app-to-portal and signed-webhook QA.

The disposable branch was deleted and its absence confirmed. Runtime was approximately 2 minutes 46 seconds at the displayed $0.01344/hour rate: estimated compute $0.00062, before tax or other usage, not a final invoice. A final read-only production query confirmed the billing table is still absent. No production migration, merge, price, secret, student-data, or live billing changes were made.
