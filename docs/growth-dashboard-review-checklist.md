# Growth dashboard review checklist

Before merge/deploy:

- [ ] `growth_events` migration reviewed for RLS and grants.
- [ ] No secret/service-role credential is sent to the browser.
- [ ] Browser events use a strict allowlist and server-derived authenticated user ID.
- [ ] Stripe lifecycle events are recorded only after webhook signature verification.
- [ ] Internal QA activity is excluded from customer KPI reporting where appropriate.
- [ ] Admin metrics endpoint requires explicit server-side administrator authorization.
- [ ] No student email addresses appear on the dashboard by default.
- [ ] Growth-event unit tests pass.
- [ ] Existing Math Coach tests pass.
- [ ] Preview deployment is visually and functionally verified before production.
