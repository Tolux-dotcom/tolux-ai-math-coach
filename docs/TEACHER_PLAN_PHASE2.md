# Tolux Teacher Plan Phase 2

## Scope

Phase 2 turns the Teacher Plan from a link generator into an attributable classroom workflow:

1. Teachers create secure assignment gateway links.
2. Students sign in and explicitly join a class with a six-character class code.
3. The assignment gateway verifies enrollment before opening the underlying Tolux lesson, diagnostic, or practice session.
4. Completed Tolux progress is attributed to the exact teacher assignment only after verifying the authenticated student, class enrollment, assignment, module, and completion record.
5. Teachers see roster counts, completion status, mastery scores, averages, and intervention-needed signals for their own classroom only.

## Security model

- Sensitive class-code lookup, enrollment writes, assignment access, and completion attribution run through the JWT-protected `teacher-classroom` Supabase Edge Function.
- Classroom enrollment and assignment-result tables use RLS.
- Student read access is limited to the student's own rows.
- Teacher read access is limited to classrooms owned by the authenticated teacher.
- The teacher report function is `SECURITY INVOKER`, not `SECURITY DEFINER`, and therefore remains subject to RLS.
- The temporary elevated RPCs used during implementation are explicitly dropped by the next migration and are not part of the final runtime architecture.
- Teacher reports expose student display names and classroom learning results, not student email addresses.

## Release gate

Keep this branch unmerged until owner review. Production Math Coach pages remain on Phase 1 until explicit approval to merge this PR.
