# Teacher Plan Phase 2 QA checklist

Before merge, verify with separate teacher and student test accounts:

- Teacher can create a class and receives a six-character class code.
- Teacher can create lesson, diagnostic, and practice assignments.
- Assignment history copies `/assignment.html?id=...` links, not direct lesson/practice URLs.
- Student assignment page requires sign-in.
- Student not yet enrolled is asked for display name and class code.
- Wrong class code does not expose classroom membership or assignment access.
- Correct class code enrolls the signed-in student and opens the assigned activity.
- Completing a matching assignment records one attribution row; refresh/retry remains idempotent.
- A completion from another module is rejected for the assignment.
- A student who is not enrolled cannot record attribution.
- Teacher roster shows only students who joined that teacher's class.
- Teacher report shows completion count, mastery score, averages, and intervention-needed flags.
- Teacher cannot request a classroom report for another teacher's classroom.
- Student email addresses are not shown in teacher reports.
- Existing standalone student lessons/practice still work without an `assignment` query parameter.
- Mobile portrait layout remains usable for assignment join and teacher reporting.
