# Isolated billing integration preview

This is the dedicated `qa/billing-integration` branch, based on draft PR #129.
Never merge or promote this branch to production: it deliberately refuses every
deployment except an explicitly configured isolated preview.

## Current status, October 11, 2026

Hosted isolated cancellation, signed webhook persistence, retained score after
fresh sign-in, replay idempotency and account isolation passed. The disposable
Supabase branch was deleted, the test callback disabled, and branch secrets
cleared. QA is intentionally inactive again. See [executed evidence](qa/hosted-billing-20261011.md).

## Historical read-only audit, October 10, 2026

The PR #129 deployment at commit `ae7f7ec` is READY. Its public authentication
configuration points to production Supabase `xnadszfvjkyxltskywin`. No branch-specific
Vercel variables exist for `codex/stripe-customer-portal`. The default Stripe and
Supabase credentials are scoped to both preview and production. This establishes
shared configuration, not the hidden Stripe key's test/live mode. Vercel does not
return the sensitive value. Do not run isolated cancellation or synthetic-student
tests on that preview.

Only production Math Coach is listed in the connected Supabase organization;
the other projects are unrelated products. Previous disposable QA branches were
removed. Do not reuse an unrelated product's database.

## Guard and exact configuration

`staging-runtime-guard.mjs` runs before server client construction or HTTP startup.
It requires preview mode, an explicit 20-letter non-production project reference,
matching public/server Supabase URLs, a server credential, Stripe test mode,
a Vercel preview return destination, and configured webhook signing secrets.
Legacy service-role JWT claims must match the isolated project and service role.
Opaque Supabase secret keys still require a live staging Auth/Data API probe to
prove their project binding. No credential value is logged by this guard.

Apply settings only to Vercel Preview / Git branch `qa/billing-integration`:

| Variable | Required source/value |
| --- | --- |
| `TOLUX_STAGING_PROJECT_REF` | New disposable data-less Math Coach branch reference |
| `SUPABASE_AUTH_URL`, `SUPABASE_URL` | Same new staging project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Staging publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing staging service-role credential, server-only |
| `SUPABASE_SECRET_KEY` | Empty override so the shared production fallback cannot apply |
| `STRIPE_SECRET_KEY` | Tolux LLC **test-mode** secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of a new test-mode endpoint for this QA deployment |
| `STRIPE_CANCELLATION_WEBHOOK_SECRET`, `STRIPE_PAYMENT_FAILED_WEBHOOK_SECRET` | Same new test endpoint signing secret; overrides shared production defaults |
| `STRIPE_STUDENT_PRICE_ID`, `STRIPE_FAMILY_PRICE_ID` | Existing verified test prices if Checkout is exercised; no new prices needed |
| `CHECKOUT_RETURN_ORIGIN` | Exact QA deployment origin verified from Vercel |
| `OPENAI_API_KEY` | Empty: billing/progress QA does not need paid AI requests |

Create the test webhook endpoint using the protected preview's authorized callback
URL and the already-approved cancellation/lifecycle event types. Keep any protection
bypass token and signing secret out of this repository and public PR. Never change
an existing production endpoint or disable Vercel Authentication.

## Run and cleanup

1. Obtain approval to transfer staging server and Stripe test credentials to the
   branch-scoped Vercel settings. Do not ask for keys in chat. Do not create a
   billable branch while waiting for input.
2. Create the disposable branch within the approved $1 budget, verify `with_data=false`
   and zero Auth users, then apply the previously verified schema-only bootstrap.
3. Set the exact isolated values, redeploy this QA branch, and verify its served
   public configuration and authenticated Data API use the staging reference.
4. Create only synthetic staging Auth/subscription fixtures. Sign in, complete and
   save Quick Check, sign out/in, verify score. Open the portal through the app;
   verify another account cannot open the subscriber's portal.
5. Use hosted cancellation and Stripe test-clock period-end progression. Verify
   signed webhook delivery, subscriber access changes, retry behavior, and retained
   quiz score after sign-out/in. API-only cancellation is not a browser-flow pass.
6. Remove disposable test fixtures/endpoint and Supabase branch after verification.
   No production user, score, billing object, secret or price is part of this run.

## Evidence

Focused isolation guards: 7/7 passed. Latest full QA branch suite: 497/497 passed,
including mathematical validation and signed local webhook-routing checks. Syntax
checks passed. Hosted authenticated cancellation and webhook persistence passed
on October 11; the environment has since been cleaned up and disabled.
