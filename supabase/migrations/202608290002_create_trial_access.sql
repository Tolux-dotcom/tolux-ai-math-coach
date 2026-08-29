-- Replace the legacy question-count allowance with a one-time active-learning trial.
-- The Free Algebra Diagnostic Test is tracked separately and does not consume trial time.
create table if not exists public.student_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_subscriber boolean not null default false,
  trial_seconds_used integer not null default 0
    check (trial_seconds_used between 0 and 600),
  trial_started_at timestamp with time zone,
  trial_exhausted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.student_access enable row level security;
revoke all on table public.student_access from anon, authenticated;
grant select, insert, update on table public.student_access to service_role;

comment on table public.student_access is
  'Tolux paid-access state. Non-subscribers receive one cumulative 600-second active-learning trial; diagnostic test access is free and separate.';
