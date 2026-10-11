# Schema-only staging rebuild and preservation QA

Verified October 10, 2026 (Chicago; October 11 UTC). Draft PR #129 only.

## Cause and scope

A new data-less Supabase branch replayed only the first two recorded migrations.
The third migration revokes access to `public.rls_auto_enable()`, but the creation
of that function is absent from recorded history. A clean local PostgreSQL replay
reproduces SQLSTATE `42883`. The database remains healthy; migration replay fails.

Read-only production metadata also shows two missing prerequisites: `student_usage`
and `lesson_completions`. Teacher Phase 2 requires the latter. Historical
`create_growth_admins` includes a production administrator seed that cannot be
replayed into an empty Auth database. The checked-in schema snapshot deliberately
omits that seed and all production rows, identifiers, credentials and emails.

This is a manual **staging-only** repair. It does not change production migration
history or fix Supabase's native automatic branch replay. Never merge this SQL
bundle back through the Supabase dashboard. No production migration was applied.

## Repeatable tools

- `scripts/staging/baseline.sql`: missing function and legacy usage table shape;
  refuses a database containing Auth users. No event trigger is attached.
- `scripts/staging/schema-history-20261010.json`: schema-only snapshot of 16
  recorded migrations, with the production administrator seed removed.
- `scripts/build-staging-schema.mjs`: outputs reviewed SQL, makes no database or
  network calls. Includes the repository's lesson and billing migrations.
- `scripts/verify-staging-schema.mjs`: isolated executable PostgreSQL checks using
  optional PGlite, including the real application entitlement reconciler.
- `scripts/verify-staging-progress-preservation.sql`: hosted SQL fixtures that
  roll back. Confirms cancellation persistence operations preserve score/usage,
  ownership replay remains unique, and subscription visibility is account-scoped.

For a disposable branch, independently verify its project reference differs from
production and `with_data=false`. Wait for initial replay to finish/fail, verify
zero Auth users, then apply the bundle once with the migration tool. Do not rerun
the whole bundle on an existing schema: historical policy creation is not
idempotent. Do not use this script as a production setup/migration command.

Local command (optional dependency remains outside application dependencies):

```sh
TOLUX_QA_PGLITE_MODULE=file:///tmp/tolux-billing-db-qa/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-staging-schema.mjs
```

## Evidence

- Local staging checks: **7/7**; syntax checks passed.
- Hosted branch `qa-pr129-replay-20261010`, project `iwehgcifberrhcyrcqmu`,
  `with_data=false`; original native replay status `MIGRATIONS_FAILED` confirmed.
- Applied `bootstrap_pr129_staging_schema` successfully. All **14 app tables**
  exist, all have RLS, and the teacher report remains security-invoker.
- Billing service role has exactly INSERT/SELECT/UPDATE. Anonymous and ordinary
  authenticated users cannot directly read/write the server-only billing table.
- Hosted billing constraints/permissions/replay checks: **7/7 groups**.
- Hosted progress preservation/account isolation checks: **4/4 groups**.
  Synthetic score 80 and question usage 4 remain after cancellation writes.
- All fixtures rolled back: zero Auth, usage, lesson and billing rows remained.
- Security advisor: informational RLS-without-policy notices on seven intended
  server-only tables; no warning/error findings. Client access remains denied.
  [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Branch deleted and only production `main` remains. Created 03:34:02 UTC;
  deletion confirmed 03:35:40 UTC, October 11. Approximate compute **$0.00036**
  at the displayed $0.01344/hour, excluding tax/other usage; not an invoice.
- Read-only production check still returns no billing ownership table. No student
  data, production schema, secrets, pricing, auth configuration or live Stripe
  objects were changed.

## Remaining release gate

The last runtime suite passed **489/489**; this update changes staging tools only.
Hosted SQL QA is not authenticated application or Stripe delivery QA. Still run a
dedicated preview tied to a staging Supabase project and Stripe test mode: sign in
as a synthetic subscriber, open the portal through the app, cancel, verify signed
webhook delivery and entitlement change, then sign out/in and confirm saved quiz
history remains. Verify another account cannot open the subscriber's portal.
Natural period-end cancellation, database-failure retries, and cross-device/mobile
behavior also remain release gates. No production-readiness claim is made here.
