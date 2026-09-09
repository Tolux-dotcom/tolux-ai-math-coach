drop policy if exists "Teachers can submit their own pilot requests" on public.school_pilot_requests;

create policy "Teachers can submit their own pilot requests"
  on public.school_pilot_requests for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) is false
    and lower(contact_email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
    and status = 'requested'
  );
