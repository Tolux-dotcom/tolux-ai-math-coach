create policy "Teachers can view enrollments in their own classrooms"
  on public.class_enrollments for select
  to authenticated
  using (exists (
    select 1 from public.teacher_classrooms c
    where c.id = class_enrollments.classroom_id
      and c.teacher_user_id = (select auth.uid())
  ));

create policy "Teachers can view assignment results in their own classrooms"
  on public.assignment_completions for select
  to authenticated
  using (exists (
    select 1 from public.teacher_classrooms c
    where c.id = assignment_completions.classroom_id
      and c.teacher_user_id = (select auth.uid())
  ));

create or replace function public.get_teacher_classroom_report(p_classroom_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.teacher_classrooms c where c.id = p_classroom_id and c.teacher_user_id = v_uid) then raise exception 'Classroom not found'; end if;
  select jsonb_build_object(
    'classroom', (select to_jsonb(x) from (select c.id, c.name, c.period, c.class_code, c.course from public.teacher_classrooms c where c.id = p_classroom_id) x),
    'students', coalesce((select jsonb_agg(to_jsonb(s) order by s.student_display_name) from (select e.student_user_id, e.student_display_name, e.joined_at from public.class_enrollments e where e.classroom_id = p_classroom_id) s), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select ta.id, ta.title, ta.teks_code, ta.assignment_type, ta.due_at, ta.created_at from public.teacher_assignments ta where ta.classroom_id = p_classroom_id) a), '[]'::jsonb),
    'completions', coalesce((select jsonb_agg(to_jsonb(r) order by r.completed_at desc) from (select ac.assignment_id, ac.student_user_id, ac.mastery_label, ac.mastery_score, ac.completed_at from public.assignment_completions ac where ac.classroom_id = p_classroom_id) r), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_teacher_classroom_report(uuid) from public, anon;
grant execute on function public.get_teacher_classroom_report(uuid) to authenticated;
