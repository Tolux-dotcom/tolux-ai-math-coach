-- Replace interaction-count lesson gating with a cumulative active-learning trial.
-- Readiness diagnostics are free and never increment this counter.
create table if not exists public.student_trial_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_seconds_used integer not null default 0
    check (trial_seconds_used between 0 and 600),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.student_trial_access enable row level security;
revoke all on table public.student_trial_access from anon, authenticated;
grant select, insert, update on table public.student_trial_access to service_role;

comment on table public.student_trial_access is
  'Server-controlled cumulative 600-second learning trial. Free diagnostics are excluded.';
