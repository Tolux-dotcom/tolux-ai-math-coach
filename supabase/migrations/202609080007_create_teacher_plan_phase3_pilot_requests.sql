create table if not exists public.school_pilot_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  contact_email text not null check (char_length(btrim(contact_email)) between 5 and 254),
  school_name text not null check (char_length(btrim(school_name)) between 1 and 180),
  district_name text check (district_name is null or char_length(btrim(district_name)) between 1 and 180),
  requester_role text not null check (requester_role in ('teacher','instructional_coach','department_chair','administrator','district_leader','other')),
  estimated_students integer check (estimated_students is null or estimated_students between 1 and 100000),
  primary_goal text check (primary_goal is null or char_length(primary_goal) <= 1500),
  status text not null default 'requested' check (status in ('requested','contacted','pilot','converted','closed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists school_pilot_requests_requester_created_idx
  on public.school_pilot_requests (requester_user_id, created_at desc);
create index if not exists school_pilot_requests_status_created_idx
  on public.school_pilot_requests (status, created_at desc);

alter table public.school_pilot_requests enable row level security;

revoke all on table public.school_pilot_requests from anon, authenticated;
grant select, insert on table public.school_pilot_requests to authenticated;
grant select, insert, update, delete on table public.school_pilot_requests to service_role;

create policy "Teachers can view their own pilot requests"
  on public.school_pilot_requests for select
  to authenticated
  using ((select auth.uid()) = requester_user_id);

create policy "Teachers can submit their own pilot requests"
  on public.school_pilot_requests for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_user_id
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
    and lower(contact_email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    and status = 'requested'
  );

comment on table public.school_pilot_requests is
  'Authenticated educator requests for Tolux school or district pilots. Requesters may read their own submissions; Tolux service-role administration controls status changes.';
