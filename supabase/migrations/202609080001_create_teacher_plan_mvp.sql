create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  school_name text,
  district_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.teacher_classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  period text,
  course text not null default 'Algebra 1' check (course = 'Algebra 1'),
  class_code text not null unique check (class_code ~ '^[A-Z2-9]{6}$'),
  archived boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint teacher_classrooms_id_owner_unique unique (id, teacher_user_id)
);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  classroom_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  module_id text not null check (module_id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  teks_code text not null check (char_length(btrim(teks_code)) between 2 and 32),
  assignment_type text not null check (assignment_type in ('lesson', 'diagnostic', 'practice')),
  question_count integer check (question_count is null or question_count in (5, 10, 20)),
  due_at timestamp with time zone,
  launch_url text not null check (char_length(launch_url) between 1 and 1000),
  status text not null default 'published' check (status in ('draft', 'published', 'closed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint teacher_assignments_classroom_owner_fk foreign key (classroom_id, teacher_user_id)
    references public.teacher_classrooms(id, teacher_user_id) on delete cascade
);

create index if not exists teacher_classrooms_owner_created_idx on public.teacher_classrooms (teacher_user_id, created_at desc);
create index if not exists teacher_assignments_owner_created_idx on public.teacher_assignments (teacher_user_id, created_at desc);
create index if not exists teacher_assignments_classroom_created_idx on public.teacher_assignments (classroom_id, created_at desc);
create index if not exists teacher_assignments_classroom_owner_idx on public.teacher_assignments (classroom_id, teacher_user_id);

alter table public.teacher_profiles enable row level security;
alter table public.teacher_classrooms enable row level security;
alter table public.teacher_assignments enable row level security;
revoke all on table public.teacher_profiles from anon, authenticated;
revoke all on table public.teacher_classrooms from anon, authenticated;
revoke all on table public.teacher_assignments from anon, authenticated;
grant select, insert, update on table public.teacher_profiles to authenticated;
grant select, insert, update, delete on table public.teacher_classrooms to authenticated;
grant select, insert, update, delete on table public.teacher_assignments to authenticated;

create policy "Teachers can view their own profile" on public.teacher_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Teachers can create their own profile" on public.teacher_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Teachers can update their own profile" on public.teacher_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Teachers can view their own classrooms" on public.teacher_classrooms for select to authenticated using ((select auth.uid()) = teacher_user_id);
create policy "Teachers can create their own classrooms" on public.teacher_classrooms for insert to authenticated with check ((select auth.uid()) = teacher_user_id);
create policy "Teachers can update their own classrooms" on public.teacher_classrooms for update to authenticated using ((select auth.uid()) = teacher_user_id) with check ((select auth.uid()) = teacher_user_id);
create policy "Teachers can delete their own classrooms" on public.teacher_classrooms for delete to authenticated using ((select auth.uid()) = teacher_user_id);
create policy "Teachers can view their own assignments" on public.teacher_assignments for select to authenticated using ((select auth.uid()) = teacher_user_id);
create policy "Teachers can create their own assignments" on public.teacher_assignments for insert to authenticated with check ((select auth.uid()) = teacher_user_id);
create policy "Teachers can update their own assignments" on public.teacher_assignments for update to authenticated using ((select auth.uid()) = teacher_user_id) with check ((select auth.uid()) = teacher_user_id);
create policy "Teachers can delete their own assignments" on public.teacher_assignments for delete to authenticated using ((select auth.uid()) = teacher_user_id);
