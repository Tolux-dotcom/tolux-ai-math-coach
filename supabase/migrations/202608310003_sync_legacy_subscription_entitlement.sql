-- Transitional safety bridge: keep Stripe subscription writes made through
-- legacy student_usage synchronized into student_trial_access while server
-- code is migrated away from question-count storage.
create or replace function public.sync_student_usage_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_trial_access (
    user_id,
    trial_seconds_used,
    is_subscriber,
    updated_at
  )
  values (
    new.user_id,
    0,
    coalesce(new.is_subscriber, false),
    now()
  )
  on conflict (user_id) do update
    set is_subscriber = excluded.is_subscriber,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_student_usage_entitlement_trigger
  on public.student_usage;

create trigger sync_student_usage_entitlement_trigger
after insert or update of is_subscriber
on public.student_usage
for each row
execute function public.sync_student_usage_entitlement();

comment on function public.sync_student_usage_entitlement() is
  'Temporary migration bridge. Mirrors Stripe entitlement from legacy student_usage into student_trial_access until all server reads/writes use student_trial_access directly.';
