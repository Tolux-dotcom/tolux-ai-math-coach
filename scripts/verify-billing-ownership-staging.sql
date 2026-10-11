-- Disposable, data-less Supabase branch only. Never run against production.
-- The caller must verify the target project reference before execution.
-- All fixtures are rolled back; no email, password, or payment is created.
begin;
do $$ begin
  if (select count(*) from auth.users) <> 0 then
    raise exception 'QA requires an empty Auth database';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.stripe_billing_ownership'::regclass) then
    raise exception 'Billing RLS is disabled';
  end if;
  if (select array_agg(privilege_type::text order by privilege_type) from information_schema.role_table_grants
      where table_schema='public' and table_name='stripe_billing_ownership' and grantee='service_role')
      is distinct from array['INSERT','SELECT','UPDATE'] then
    raise exception 'Service permissions exceed required operations';
  end if;
end $$;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');

set local role anon;
do $$ begin
  begin perform * from public.stripe_billing_ownership; raise exception 'Anonymous read unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
    values ('00000000-0000-4000-8000-000000000001','cus_denied','sub_denied');
    raise exception 'Anonymous insert unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform * from public.stripe_billing_ownership; raise exception 'Authenticated read unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
    values ('00000000-0000-4000-8000-000000000001','cus_denied','sub_denied');
    raise exception 'Authenticated insert unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
values ('00000000-0000-4000-8000-000000000001','cus_fixture','sub_fixture')
on conflict(user_id) do update set stripe_subscription_id=excluded.stripe_subscription_id;
insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
values ('00000000-0000-4000-8000-000000000001','cus_fixture','sub_fixture')
on conflict(user_id) do update set stripe_subscription_id=excluded.stripe_subscription_id;
update public.stripe_billing_ownership set stripe_subscription_id='sub_renewed'
where user_id='00000000-0000-4000-8000-000000000001';
do $$ begin
  if (select count(*) from public.stripe_billing_ownership) <> 1 or
     (select stripe_subscription_id from public.stripe_billing_ownership) <> 'sub_renewed' then
    raise exception 'Ownership replay/update failed';
  end if;
  begin delete from public.stripe_billing_ownership; raise exception 'Service DELETE unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin truncate public.stripe_billing_ownership; raise exception 'Service TRUNCATE unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  begin insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
    values ('00000000-0000-4000-8000-000000000002','cus_fixture','sub_other');
    raise exception 'Duplicate customer unexpectedly allowed';
  exception when unique_violation then null; end;
  begin insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
    values ('00000000-0000-4000-8000-000000000002','cus_other','sub_renewed');
    raise exception 'Duplicate subscription unexpectedly allowed';
  exception when unique_violation then null; end;
  begin insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
    values ('00000000-0000-4000-8000-000000000003','cus_missing','sub_missing');
    raise exception 'Missing Auth user unexpectedly allowed';
  exception when foreign_key_violation then null; end;
  begin insert into public.stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
    values ('00000000-0000-4000-8000-000000000002','invalid','sub_valid');
    raise exception 'Invalid Stripe identifier unexpectedly allowed';
  exception when check_violation then null; end;
end $$;
rollback;
select jsonb_build_object('passed_groups',7,'auth_fixture_rows_remaining',(select count(*) from auth.users),
  'billing_fixture_rows_remaining',(select count(*) from public.stripe_billing_ownership)) as staging_qa;
