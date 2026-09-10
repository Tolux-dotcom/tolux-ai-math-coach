# Growth analytics security model

- `growth_events` lives in `public` but has RLS enabled.
- `anon` and `authenticated` receive no direct table or sequence privileges.
- Writes occur through the Tolux server using the server-only Supabase credential.
- App event names are allowlisted.
- Subscription lifecycle events are accepted only from verified Stripe webhook handling.
- `user_id` must come from the server-verified Supabase session for app events, never from request JSON.
- Arbitrary nested client metadata is discarded; only small primitive properties are retained.
- The admin metrics endpoint must require explicit server-side administrator authorization.
- Dashboard responses should be aggregates and should not expose student emails by default.
