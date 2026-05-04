alter table public.users
  add column if not exists scan_count integer not null default 0 check (scan_count >= 0),
  add column if not exists scan_limit integer not null default 10 check (scan_limit >= 0),
  add column if not exists last_scan_reset timestamptz not null default now();

update public.users
set ai_scan_limit = 10
where plan = 'free'
  and ai_scan_limit < 10;

update public.users
set scan_limit = 10
where plan = 'free'
  and scan_limit < 10;

update public.users
set scan_count = ai_scans_used_today
where scan_count = 0
  and ai_scans_used_today > 0;

alter table public.feature_flags
  alter column ai_scan_enabled set default true;

insert into public.feature_flags (id, ai_scan_enabled, outfit_generator_enabled)
values (true, true, true)
on conflict (id) do update
set ai_scan_enabled = true,
    updated_at = now();

create index if not exists users_scan_usage_idx
on public.users (plan, scan_count, scan_limit)
where deleted_at is null;

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
      scan_count = 0,
      last_reset_date = now(),
      last_scan_reset = now(),
      updated_at = now()
  where last_reset_date < date_trunc('day', now())
     or last_scan_reset < date_trunc('day', now());

  get diagnostics affected = row_count;
  return affected;
end;
$$;
