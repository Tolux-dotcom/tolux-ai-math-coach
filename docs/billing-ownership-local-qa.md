# Billing ownership migration QA

This verification uses a temporary in-memory Postgres engine and fake users. It never connects to Supabase or Stripe, does not copy student data, and does not change application dependencies.

Install the pinned QA-only dependency outside the repository and run:

```sh
npm install --prefix /tmp/tolux-billing-db-qa @electric-sql/pglite@0.5.8 --ignore-scripts --save-exact
TOLUX_QA_PGLITE_MODULE=file:///tmp/tolux-billing-db-qa/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-billing-ownership.mjs
```

The script applies the actual migration, exercises role permissions, checks ownership uniqueness and foreign keys, replays an upsert, reapplies the migration, and compares score, entitlement, and trial fixtures before and after.

Passing proves the migration behaves correctly in this isolated Postgres environment. It does not verify Supabase Auth, Data API exposure, deployed preview configuration, or Stripe webhook persistence. Those remain staging release checks.

For staging, create a data-less branch, verify its project reference differs from production, apply `supabase/migrations/202610070001_create_stripe_billing_ownership.sql`, and verify table RLS and grants. Do not merge the database branch or deploy production as part of QA. Approve the displayed branch cost before creating billable infrastructure.
