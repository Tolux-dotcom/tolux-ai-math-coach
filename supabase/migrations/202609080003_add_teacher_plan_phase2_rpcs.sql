create or replace function public.join_teacher_class(p_class_code text, p_display_name text)
returns table (classroom_id uuid, class_name text, class_period text)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_class public.teacher_classrooms%rowtype; v_name text := btrim(coalesce(p_display_name, ''));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 120 then raise exception 'Enter a valid student name'; end if;
  select * into v_class from public.teacher_classrooms where class_code = upper(btrim(p_class_code)) and archived = false limit 1;
  if not found then raise exception 'Class code not found'; end if;
  insert into public.class_enrollments (classroom_id, student_user_id, student_display_name, updated_at)
  values (v_class.id, v_uid, v_name, now())
  on conflict (classroom_id, student_user_id) do update set student_display_name = excluded.student_display_name, updated_at = now();
  return query select v_class.id, v_class.name, v_class.period;
end; $$;

create or replace function public.get_assignment_preview(p_assignment_id uuid)
returns table (assignment_id uuid, title text, class_name text, class_period text, teks_code text, assignment_type text, due_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query select a.id, a.title, c.name, c.period, a.teks_code, a.assignment_type, a.due_at
  from public.teacher_assignments a join public.teacher_classrooms c on c.id = a.classroom_id
  where a.id = p_assignment_id and a.status = 'published' and c.archived = false;
end; $$;

create or replace function public.get_assignment_for_student(p_assignment_id uuid)
returns table (assignment_id uuid, classroom_id uuid, title text, module_id text, teks_code text, assignment_type text, question_count integer, due_at timestamptz, launch_url text)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  return query select a.id, a.classroom_id, a.title, a.module_id, a.teks_code, a.assignment_type, a.question_count, a.due_at, a.launch_url
  from public.teacher_assignments a
  where a.id = p_assignment_id and a.status = 'published'
  and exists (select 1 from public.class_enrollments e where e.classroom_id = a.classroom_id and e.student_user_id = v_uid);
end; $$;

create or replace function public.record_assignment_completion(p_assignment_id uuid, p_client_completion_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_assignment public.teacher_assignments%rowtype; v_completion public.lesson_completions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_assignment from public.teacher_assignments where id = p_assignment_id and status = 'published';
  if not found then raise exception 'Assignment not found'; end if;
  if not exists (select 1 from public.class_enrollments e where e.classroom_id = v_assignment.classroom_id and e.student_user_id = v_uid) then raise exception 'Student is not enrolled in this class'; end if;
  select * into v_completion from public.lesson_completions where user_id = v_uid and client_completion_id = p_client_completion_id limit 1;
  if not found then raise exception 'Completion not found'; end if;
  if v_completion.completed_at < v_assignment.created_at then raise exception 'Completion predates assignment'; end if;
  if v_assignment.assignment_type = 'practice' then
    if v_completion.module_id <> ('practice-' || v_assignment.module_id) then raise exception 'Completion does not match assignment'; end if;
  else
    if v_completion.module_id <> v_assignment.module_id then raise exception 'Completion does not match assignment'; end if;
  end if;
  insert into public.assignment_completions (assignment_id, classroom_id, student_user_id, lesson_completion_id, module_id, mastery_label, mastery_score, completed_at)
  values (v_assignment.id, v_assignment.classroom_id, v_uid, v_completion.id, v_completion.module_id, v_completion.mastery_label, v_completion.mastery_score, v_completion.completed_at)
  on conflict (assignment_id, lesson_completion_id) do nothing;
  return true;
end; $$;

create or replace function public.get_teacher_classroom_report(p_classroom_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
end; $$;

revoke all on function public.join_teacher_class(text, text) from public, anon;
revoke all on function public.get_assignment_preview(uuid) from public, anon;
revoke all on function public.get_assignment_for_student(uuid) from public, anon;
revoke all on function public.record_assignment_completion(uuid, uuid) from public, anon;
revoke all on function public.get_teacher_classroom_report(uuid) from public, anon;
grant execute on function public.join_teacher_class(text, text) to authenticated;
grant execute on function public.get_assignment_preview(uuid) to authenticated;
grant execute on function public.get_assignment_for_student(uuid) to authenticated;
grant execute on function public.record_assignment_completion(uuid, uuid) to authenticated;
grant execute on function public.get_teacher_classroom_report(uuid) to authenticated;
