create index if not exists assignment_completions_student_idx
  on public.assignment_completions (student_user_id, completed_at desc);

drop policy if exists "Students can view their own class enrollments" on public.class_enrollments;
drop policy if exists "Teachers can view enrollments in their own classrooms" on public.class_enrollments;
create policy "Class enrollment visibility"
  on public.class_enrollments for select
  to authenticated
  using (
    student_user_id = (select auth.uid())
    or exists (
      select 1 from public.teacher_classrooms c
      where c.id = class_enrollments.classroom_id
        and c.teacher_user_id = (select auth.uid())
    )
  );

drop policy if exists "Students can view their own assignment results" on public.assignment_completions;
drop policy if exists "Teachers can view assignment results in their own classrooms" on public.assignment_completions;
create policy "Assignment result visibility"
  on public.assignment_completions for select
  to authenticated
  using (
    student_user_id = (select auth.uid())
    or exists (
      select 1 from public.teacher_classrooms c
      where c.id = assignment_completions.classroom_id
        and c.teacher_user_id = (select auth.uid())
    )
  );
