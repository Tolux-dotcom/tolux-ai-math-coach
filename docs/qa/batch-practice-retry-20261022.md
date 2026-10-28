# Batch Practice same-attempt retry QA — 2026-10-22

## Scope

This draft-only change adds a direct progress-save retry control to the 23 Algebra 1 Practice skills routed through Batch 5–9.

- A failed or queued completion now shows **Retry Progress Save** on the result screen.
- A retry reuses the original completion report and `completion_id`; it does not create another attempt.
- The control is removed only after the account API confirms the save.
- If the retry is still queued or unsaved, the control remains available and the status stays truthful.
- Score, item records, owner binding, local queue format, 401 refresh, dashboard replay, grading, access, and entitlement logic are unchanged.

## Regression evidence

Before the source change, the new regression test failed in all five Batch runtimes because a second save created a second completion identifier. The source/status assertions also failed because no direct retry control existed.

After the source change:

- Batch retry and persistence tests: **25/25 passed**.
- The same-attempt fixture calls save twice, observes one generated identifier, and confirms that both requests contain the same report object.
- The retry-control fixture confirms that the button invokes the save, reports the confirmed account save, and removes itself after success.
- Repository syntax gate: passed.
- Full synchronized draft suite: **809/809 passed**, with zero failures or skips.
- Fresh current-`main` baseline: **490/490 passed**, with zero failures or skips.
- `git diff --check`: passed.
- An isolated local server with all Supabase, Stripe, and OpenAI server credentials removed served the Practice page and all five changed Batch assets with HTTP 200 and exact source parity. Unauthenticated progress GET and POST requests both returned 401; no database write was possible.

## Non-production QA and release limits

No production deployment, live database write, student-data change, schema change, secret change, price change, Stripe operation, or entitlement change was performed.

Before review, use a disposable student account in the preview to finish one Batch Practice session, interrupt or block the first progress request, press **Retry Progress Save**, and confirm that exactly one attempt appears after reload and on a second device. Repeat with an expired token and on a physical phone. Preserve existing browser storage and student data.

Generic Practice and specialized A.10F–A.12B still lack this direct result-screen retry control. Their existing queue and dashboard recovery remain unchanged. This work does not restore any previously missing Test Prep result.
