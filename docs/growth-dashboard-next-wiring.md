# Growth analytics wiring steps

The remaining wiring in `server.mjs` should:

1. Import `recordGrowthEvent` and `getGrowthMetrics`.
2. Add `POST /api/growth-event`:
   - Verify Supabase bearer token.
   - Reject internal QA sessions.
   - Ignore client-supplied user identifiers.
   - Call `recordGrowthEvent(supabaseAdmin, user.id, body)`.
3. In `POST /api/create-checkout-session`, record `checkout_started` after plan validation and before creating the Stripe session.
4. In the verified Stripe webhook:
   - `checkout.session.completed` -> `subscription_activated` after entitlement update succeeds.
   - `customer.subscription.deleted` -> `subscription_cancelled`.
   - `invoice.payment_failed` -> `payment_failed`.
5. Add `GET /api/admin/growth-metrics` protected by an explicit server-side admin allowlist/app-metadata check, then call `getGrowthMetrics`.
6. Instrument browser actions using `public/growth-tracking.js` for diagnostic, lesson, trial, and upgrade events.

Do not deploy a partially protected admin endpoint.