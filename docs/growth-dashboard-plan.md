# Tolux AI Math Coach Growth Dashboard

## Goal
Measure the student acquisition and paid-conversion funnel before expanding the product surface.

## Current baseline (2026-09-10)
- 5 Supabase Auth users
- 4 student_usage rows
- 1 student marked `is_subscriber = true`
- 25 lesson completion rows
- 3 student trial-access rows

These counts are operational baselines, not yet a complete acquisition funnel because visitor, diagnostic, upgrade-click, and checkout-start events are not persisted today.

## Funnel to measure
1. Visitor
2. Diagnostic started
3. Diagnostic completed
4. Account created
5. Lesson started
6. Trial started / trial exhausted
7. Upgrade clicked
8. Checkout started
9. Paid subscription activated
10. Subscription cancelled / payment failed

## Dashboard KPIs
- Registered users
- Learners with student_usage
- Learners active in last 7 and 30 days
- Diagnostic starts and completions
- Lesson completions (excluding internal QA where appropriate)
- Trial starts and exhausted trials
- Upgrade clicks
- Checkout starts
- Paid subscribers
- Registration-to-paid conversion
- Upgrade-click-to-paid conversion
- Recent signups and recent conversions

## Security requirement
The growth dashboard must be server-side/admin-only. Never expose the Supabase service role key, Stripe secret key, raw auth user data, or unrestricted analytics endpoints to browser clients. Admin authorization must use server-verified identity/allowlisting or app metadata, not user-editable metadata.

## Implementation sequence
1. Add a server-owned `growth_events` table with RLS enabled and no direct anon/authenticated write access.
2. Add a narrow authenticated `/api/growth-event` endpoint with a strict event allowlist and server-derived user ID.
3. Instrument diagnostic start/completion, lesson start, trial exhausted, upgrade click, and checkout start.
4. Record paid/cancelled/payment-failed lifecycle events from verified Stripe webhooks.
5. Add an admin-only `/api/admin/growth-metrics` aggregate endpoint.
6. Add a private dashboard page consuming aggregates only; do not expose student emails by default.
7. Add tests for event validation, authorization, QA exclusion, and conversion calculations.

## First-50 operating target
Use the dashboard to drive the first 50 real Algebra 1 learners. Do not treat internal QA sessions as customer acquisition or conversion. Review the funnel weekly and fix the largest drop-off before adding major new curriculum scope.
