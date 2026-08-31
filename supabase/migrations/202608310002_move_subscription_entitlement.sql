-- Move paid entitlement onto the same access record that owns the timed trial.
-- This removes the architectural dependency on legacy question-count usage.
alter table public.student_trial_access
  add column if not exists is_subscriber boolean not null default false;

-- Preserve all existing paid customers before retiring student_usage.questions_used.
insert into public.student_trial_access (user_id, trial_seconds_used, is_subscriber)
select
  su.user_id,
  0,
  coalesce(su.is_subscriber, false)
from public.student_usage su
on conflict (user_id) do update
set is_subscriber = excluded.is_subscriber,
    updated_at = now();

comment on column public.student_trial_access.is_subscriber is
  'Stripe-controlled paid entitlement. Subscribers bypass the 600-second trial.';
