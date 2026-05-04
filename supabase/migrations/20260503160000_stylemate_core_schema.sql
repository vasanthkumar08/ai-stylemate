-- StyleMate AI core schema for Supabase PostgreSQL.
-- Auth identity remains in auth.users; public.users is the app-facing user record.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists vector with schema extensions;

create type public.subscription_tier as enum ('free', 'starter', 'pro', 'studio', 'enterprise');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');
create type public.wardrobe_category as enum ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag', 'jewelry', 'activewear', 'other');
create type public.item_visibility as enum ('private', 'shared');
create type public.outfit_status as enum ('draft', 'generated', 'accepted', 'rejected', 'archived');
create type public.activity_event_type as enum (
  'auth.sign_in',
  'profile.updated',
  'wardrobe.created',
  'wardrobe.updated',
  'wardrobe.deleted',
  'recommendation.generated',
  'outfit.saved',
  'subscription.updated',
  'usage.incremented'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

create or replace function public.owns_user(target_user_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = target_user_id or public.is_service_role();
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'stylist')),
  status text not null default 'active' check (status in ('active', 'disabled', 'pending_deletion')),
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint users_email_length check (char_length(email::text) <= 320)
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text,
  username extensions.citext unique,
  bio text,
  location text,
  gender text,
  birthdate date,
  body_type text,
  height_cm numeric(5,2),
  measurements jsonb not null default '{}'::jsonb,
  preferred_avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_username_length check (username is null or char_length(username::text) between 3 and 40),
  constraint profiles_measurements_object check (jsonb_typeof(measurements) = 'object')
);

create table public.style_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  style_personas text[] not null default '{}',
  favorite_colors text[] not null default '{}',
  avoided_colors text[] not null default '{}',
  preferred_fits text[] not null default '{}',
  disliked_materials text[] not null default '{}',
  climate_preferences jsonb not null default '{}'::jsonb,
  occasion_weights jsonb not null default '{}'::jsonb,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  ai_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint style_preferences_budget_check check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  ),
  constraint style_preferences_climate_object check (jsonb_typeof(climate_preferences) = 'object'),
  constraint style_preferences_occasion_object check (jsonb_typeof(occasion_weights) = 'object')
);

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category public.wardrobe_category not null,
  subcategory text,
  brand text,
  size_label text,
  colors text[] not null default '{}',
  season_tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  material_tags text[] not null default '{}',
  image_url text not null,
  cloudinary_public_id text,
  visibility public.item_visibility not null default 'private',
  purchase_url text,
  purchase_price numeric(10,2),
  currency char(3) default 'USD',
  last_worn_at timestamptz,
  wear_count integer not null default 0 check (wear_count >= 0),
  ai_attributes jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint wardrobe_items_name_length check (char_length(name) between 1 and 140),
  constraint wardrobe_items_ai_attributes_object check (jsonb_typeof(ai_attributes) = 'object')
);

create table public.outfit_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_hash text,
  occasion text,
  season text,
  weather_context jsonb not null default '{}'::jsonb,
  destination text,
  prompt text,
  item_ids uuid[] not null default '{}',
  response jsonb not null default '{}'::jsonb,
  score numeric(5,4) check (score is null or (score >= 0 and score <= 1)),
  model_name text,
  status public.outfit_status not null default 'generated',
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint outfit_recommendations_weather_object check (jsonb_typeof(weather_context) = 'object'),
  constraint outfit_recommendations_response_object check (jsonb_typeof(response) = 'object')
);

create table public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recommendation_id uuid references public.outfit_recommendations(id) on delete set null,
  name text not null,
  notes text,
  occasion text,
  item_ids uuid[] not null default '{}',
  cover_image_url text,
  is_favorite boolean not null default false,
  planned_for date,
  worn_at timestamptz,
  rating smallint check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint saved_outfits_name_length check (char_length(name) between 1 and 140)
);

create table public.usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  recommendations_used integer not null default 0 check (recommendations_used >= 0),
  recommendations_limit integer not null default 20 check (recommendations_limit >= 0),
  uploads_used integer not null default 0 check (uploads_used >= 0),
  uploads_limit integer not null default 100 check (uploads_limit >= 0),
  storage_bytes_used bigint not null default 0 check (storage_bytes_used >= 0),
  storage_bytes_limit bigint not null default 1073741824 check (storage_bytes_limit >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint usage_limits_period_check check (period_start <= period_end),
  constraint usage_limits_user_period_unique unique (user_id, period_start),
  constraint usage_limits_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'active',
  provider text not null default 'manual' check (provider in ('manual', 'stripe', 'paddle', 'app_store', 'play_store')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint subscriptions_provider_subscription_unique unique (provider, provider_subscription_id),
  constraint subscriptions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_type public.activity_event_type not null,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint activity_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_style_preferences_updated_at before update on public.style_preferences
  for each row execute function public.set_updated_at();
create trigger set_wardrobe_items_updated_at before update on public.wardrobe_items
  for each row execute function public.set_updated_at();
create trigger set_outfit_recommendations_updated_at before update on public.outfit_recommendations
  for each row execute function public.set_updated_at();
create trigger set_saved_outfits_updated_at before update on public.saved_outfits
  for each row execute function public.set_updated_at();
create trigger set_usage_limits_updated_at before update on public.usage_limits
  for each row execute function public.set_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger set_activity_logs_updated_at before update on public.activity_logs
  for each row execute function public.set_updated_at();

create index users_active_idx on public.users (id) where deleted_at is null;
create index users_email_idx on public.users (email) where deleted_at is null;

create index profiles_user_active_idx on public.profiles (user_id) where deleted_at is null;
create index profiles_username_active_idx on public.profiles (username) where deleted_at is null and username is not null;

create index style_preferences_user_active_idx on public.style_preferences (user_id) where deleted_at is null;
create index style_preferences_personas_gin_idx on public.style_preferences using gin (style_personas) where deleted_at is null;
create index style_preferences_colors_gin_idx on public.style_preferences using gin (favorite_colors) where deleted_at is null;

create index wardrobe_items_user_created_idx on public.wardrobe_items (user_id, created_at desc) where deleted_at is null;
create index wardrobe_items_user_category_idx on public.wardrobe_items (user_id, category) where deleted_at is null;
create index wardrobe_items_user_last_worn_idx on public.wardrobe_items (user_id, last_worn_at desc nulls last) where deleted_at is null;
create index wardrobe_items_colors_gin_idx on public.wardrobe_items using gin (colors) where deleted_at is null;
create index wardrobe_items_seasons_gin_idx on public.wardrobe_items using gin (season_tags) where deleted_at is null;
create index wardrobe_items_occasions_gin_idx on public.wardrobe_items using gin (occasion_tags) where deleted_at is null;
create index wardrobe_items_ai_attributes_gin_idx on public.wardrobe_items using gin (ai_attributes jsonb_path_ops) where deleted_at is null;

create index outfit_recommendations_user_created_idx on public.outfit_recommendations (user_id, created_at desc) where deleted_at is null;
create index outfit_recommendations_user_status_idx on public.outfit_recommendations (user_id, status, created_at desc) where deleted_at is null;
create index outfit_recommendations_request_hash_idx on public.outfit_recommendations (user_id, request_hash) where deleted_at is null and request_hash is not null;
create index outfit_recommendations_item_ids_gin_idx on public.outfit_recommendations using gin (item_ids) where deleted_at is null;
create index outfit_recommendations_response_gin_idx on public.outfit_recommendations using gin (response jsonb_path_ops) where deleted_at is null;

create index saved_outfits_user_created_idx on public.saved_outfits (user_id, created_at desc) where deleted_at is null;
create index saved_outfits_user_favorites_idx on public.saved_outfits (user_id, is_favorite, created_at desc) where deleted_at is null;
create index saved_outfits_user_planned_idx on public.saved_outfits (user_id, planned_for) where deleted_at is null and planned_for is not null;
create index saved_outfits_item_ids_gin_idx on public.saved_outfits using gin (item_ids) where deleted_at is null;

create index usage_limits_user_period_idx on public.usage_limits (user_id, period_start desc, period_end desc) where deleted_at is null;

create index subscriptions_user_status_idx on public.subscriptions (user_id, status, current_period_end desc nulls last) where deleted_at is null;
create unique index subscriptions_one_active_per_user_idx on public.subscriptions (user_id)
  where deleted_at is null and status in ('trialing', 'active', 'past_due', 'paused');
create index subscriptions_provider_customer_idx on public.subscriptions (provider, provider_customer_id) where deleted_at is null and provider_customer_id is not null;

create index activity_logs_user_created_idx on public.activity_logs (user_id, created_at desc) where deleted_at is null;
create index activity_logs_event_created_idx on public.activity_logs (event_type, created_at desc) where deleted_at is null;
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id) where deleted_at is null and entity_id is not null;
create index activity_logs_created_brin_idx on public.activity_logs using brin (created_at);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.style_preferences enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfit_recommendations enable row level security;
alter table public.saved_outfits enable row level security;
alter table public.usage_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activity_logs enable row level security;

create policy "users can read own user record"
on public.users for select
using (public.owns_user(id) and deleted_at is null);

create policy "users can update own user record"
on public.users for update
using (public.owns_user(id) and deleted_at is null)
with check (public.owns_user(id));

create policy "users can insert own user record"
on public.users for insert
with check (public.owns_user(id));

create policy "profiles are owner readable"
on public.profiles for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "profiles are owner insertable"
on public.profiles for insert
with check (public.owns_user(user_id));

create policy "profiles are owner updatable"
on public.profiles for update
using (public.owns_user(user_id) and deleted_at is null)
with check (public.owns_user(user_id));

create policy "style preferences are owner readable"
on public.style_preferences for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "style preferences are owner insertable"
on public.style_preferences for insert
with check (public.owns_user(user_id));

create policy "style preferences are owner updatable"
on public.style_preferences for update
using (public.owns_user(user_id) and deleted_at is null)
with check (public.owns_user(user_id));

create policy "wardrobe items are owner readable"
on public.wardrobe_items for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "wardrobe items are owner insertable"
on public.wardrobe_items for insert
with check (public.owns_user(user_id));

create policy "wardrobe items are owner updatable"
on public.wardrobe_items for update
using (public.owns_user(user_id) and deleted_at is null)
with check (public.owns_user(user_id));

create policy "outfit recommendations are owner readable"
on public.outfit_recommendations for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "outfit recommendations are owner insertable"
on public.outfit_recommendations for insert
with check (public.owns_user(user_id));

create policy "outfit recommendations are owner updatable"
on public.outfit_recommendations for update
using (public.owns_user(user_id) and deleted_at is null)
with check (public.owns_user(user_id));

create policy "saved outfits are owner readable"
on public.saved_outfits for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "saved outfits are owner insertable"
on public.saved_outfits for insert
with check (public.owns_user(user_id));

create policy "saved outfits are owner updatable"
on public.saved_outfits for update
using (public.owns_user(user_id) and deleted_at is null)
with check (public.owns_user(user_id));

create policy "usage limits are owner readable"
on public.usage_limits for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "usage limits are service managed"
on public.usage_limits for all
using (public.is_service_role())
with check (public.is_service_role());

create policy "subscriptions are owner readable"
on public.subscriptions for select
using (public.owns_user(user_id) and deleted_at is null);

create policy "subscriptions are service managed"
on public.subscriptions for all
using (public.is_service_role())
with check (public.is_service_role());

create policy "activity logs are owner readable"
on public.activity_logs for select
using ((user_id is not null and public.owns_user(user_id) and deleted_at is null) or public.is_service_role());

create policy "activity logs are service insertable"
on public.activity_logs for insert
with check (public.is_service_role() or (user_id is not null and auth.uid() = user_id));

create policy "activity logs are service updatable"
on public.activity_logs for update
using (public.is_service_role())
with check (public.is_service_role());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.users.full_name, excluded.full_name),
      avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url);

  insert into public.profiles (user_id, display_name, preferred_avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(new.raw_user_meta_data ->> 'full_name', '')),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (user_id) do nothing;

  insert into public.style_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
