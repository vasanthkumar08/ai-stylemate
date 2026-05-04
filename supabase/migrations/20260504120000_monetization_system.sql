alter table public.users
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro')),
  add column if not exists daily_outfit_limit integer not null default 3 check (daily_outfit_limit >= 0),
  add column if not exists outfits_used_today integer not null default 0 check (outfits_used_today >= 0),
  add column if not exists ai_scan_limit integer not null default 10 check (ai_scan_limit >= 0),
  add column if not exists ai_scans_used_today integer not null default 0 check (ai_scans_used_today >= 0),
  add column if not exists last_reset_date timestamptz not null default now();

create table if not exists public.revenue_placeholder (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro')),
  start_date timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'past_due')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_revenue_placeholder_updated_at on public.revenue_placeholder;
create trigger set_revenue_placeholder_updated_at before update on public.revenue_placeholder
  for each row execute function public.set_updated_at();

create index if not exists users_plan_active_idx on public.users (plan) where deleted_at is null;
create index if not exists revenue_placeholder_user_idx on public.revenue_placeholder (user_id, start_date desc) where deleted_at is null;
create index if not exists revenue_placeholder_plan_status_idx on public.revenue_placeholder (plan, status) where deleted_at is null;

alter table public.revenue_placeholder enable row level security;

create policy "revenue placeholder is owner readable"
on public.revenue_placeholder for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "revenue placeholder is service managed"
on public.revenue_placeholder for all
using (public.is_service_role())
with check (public.is_service_role());

create or replace function public.reset_daily_user_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.users
  set outfits_used_today = 0,
      ai_scans_used_today = 0,
      last_reset_date = now(),
      updated_at = now()
  where last_reset_date < date_trunc('day', now());

  get diagnostics affected = row_count;
  return affected;
end;
$$;
