# Growth dashboard test plan

- Validate every accepted app event.
- Reject Stripe lifecycle events submitted through the app endpoint.
- Reject unknown plans and unsafe metadata.
- Confirm internal QA is excluded from customer metrics.
- Confirm registration-to-paid and upgrade-to-paid ratios handle zero denominators.
- Confirm Stripe webhook lifecycle events are recorded only after signature verification.
- Confirm dashboard endpoint denies non-admin users.
- Confirm production build and existing test suite remain green.
- Verify preview dashboard visually on desktop and mobile before production.