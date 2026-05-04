create table if not exists public.feature_flags (
  id boolean primary key default true,
  ai_scan_enabled boolean not null default true,
  outfit_generator_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_flags_singleton check (id = true)
);

insert into public.feature_flags (id, ai_scan_enabled, outfit_generator_enabled)
values (true, true, true)
on conflict (id) do nothing;

drop trigger if exists set_feature_flags_updated_at on public.feature_flags;
create trigger set_feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy "feature flags are authenticated readable"
on public.feature_flags for select
using (auth.uid() is not null or public.is_service_role());

create policy "feature flags are service managed"
on public.feature_flags for all
using (public.is_service_role())
with check (public.is_service_role());
