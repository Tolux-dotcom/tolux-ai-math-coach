# Teacher Plan Phase 2 security posture

Sensitive classroom actions are not performed by direct client table access.

- Class-code lookup and enrollment writes: JWT-protected Supabase Edge Function.
- Assignment access: authenticated Edge Function verifies class enrollment.
- Completion attribution: Edge Function verifies authenticated student, enrollment, assignment, module, assignment creation time, and persisted Tolux completion.
- Teacher reporting: SECURITY INVOKER function plus RLS ownership checks.
- Student direct reads: only own enrollment/result rows through RLS.
- Teacher direct reads: only owned classroom enrollment/result rows through RLS.
- Student email addresses are excluded from classroom reports.

The Supabase security advisor shows no new Phase 2 security warnings after the final architecture. Remaining notices predate Phase 2.
