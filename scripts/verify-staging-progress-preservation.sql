-- Disposable, data-less staging only. Verify the project reference first.
-- Synthetic fixtures have no email, password, or payment and roll back.
begin;
do $$ begin
  if (select count(*) from auth.users) <> 0 then
    raise exception 'QA requires an empty Auth database';
  end if;
  if (select count(*) from pg_tables where schemaname='public') <> 14 or
     exists(select 1 from pg_tables where schemaname='public' and not rowsecurity) then
    raise exception 'Incomplete or unprotected staging schema';
  end if;
end $$;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');
set local role service_role;
insert into public.student_usage(user_id,questions_used,is_subscriber)
values ('00000000-0000-4000-8000-000000000001',4,true);
insert into public.lesson_completions
  (user_id,client_completion_id,module_id,completed_at,mastery_label,mastery_score)
values ('00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010','test-prep-quick-check',now(),'Developing',80);
insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
values ('00000000-0000-4000-8000-000000000001','cus_fixture','sub_fixture');
-- Exercise the SQL persistence operations used when cancellation revokes access.
-- Stripe delivery and authenticated application routing are separate QA gates.
update public.student_usage set is_subscriber=false
where user_id='00000000-0000-4000-8000-000000000001';
insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
values ('00000000-0000-4000-8000-000000000001','cus_fixture','sub_fixture')
on conflict(user_id) do update set stripe_subscription_id=excluded.stripe_subscription_id;
do $$ begin
  if (select is_subscriber from public.student_usage) is distinct from false or
     (select questions_used from public.student_usage) <> 4 or
     (select mastery_score from public.lesson_completions) <> 80 or
     (select count(*) from public.stripe_billing_ownership) <> 1 then
    raise exception 'Cancellation or replay damaged saved progress';
  end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.student_usage) <> 1 then
    raise exception 'Owner cannot read subscription status';
  end if;
  begin perform * from public.lesson_completions;
    raise exception 'Direct client history access unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.student_usage) <> 0 then
    raise exception 'Another account can read subscription status';
  end if;
end $$;
reset role;
rollback;
select jsonb_build_object('passed_groups',4,
  'auth_rows',(select count(*) from auth.users),
  'usage_rows',(select count(*) from public.student_usage),
  'lesson_rows',(select count(*) from public.lesson_completions),
  'billing_rows',(select count(*) from public.stripe_billing_ownership)) as progress_qa;
