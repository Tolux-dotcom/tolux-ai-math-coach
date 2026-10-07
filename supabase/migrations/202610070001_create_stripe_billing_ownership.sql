-- Keep Stripe identifiers separate from student progress and trial data.
-- This is additive: existing student records and entitlements are unchanged.
create table if not exists public.stripe_billing_ownership (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique
    check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  stripe_subscription_id text not null unique
    check (stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.stripe_billing_ownership enable row level security;
revoke all on table public.stripe_billing_ownership from public, anon, authenticated;
grant select, insert, update on table public.stripe_billing_ownership to service_role;

comment on table public.stripe_billing_ownership is
  'Server-only mapping from an authenticated Tolux user to Stripe billing objects verified by Checkout or signed webhooks.';
