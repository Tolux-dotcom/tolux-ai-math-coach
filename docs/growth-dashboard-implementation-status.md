# Growth Dashboard implementation status

Implemented on `codex/growth-dashboard-tracking` after the planning PR was merged:

- Secure `growth_events` schema migration with RLS and browser-role grants revoked.
- Event validation and storage helpers in `growth-analytics.mjs`.
- Aggregate KPI calculation for registered users, paid subscribers, active learners, lessons, diagnostics, trials, upgrade/checkout events, and subscription lifecycle.
- Unit coverage for event allowlisting, plan validation, property sanitization, and Stripe-only lifecycle events.

Still required before deployment:

- Wire helpers into `server.mjs` API routes and verified Stripe webhook branches.
- Instrument the browser's diagnostic, lesson, trial-paywall, upgrade, and checkout actions.
- Add a private admin dashboard UI.
- Apply the migration to the production Supabase project only after implementation review/testing.
