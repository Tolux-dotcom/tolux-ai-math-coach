create table if not exists public.growth_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.growth_admins enable row level security;
revoke all on table public.growth_admins from anon, authenticated;
grant select, insert, update, delete on table public.growth_admins to service_role;
