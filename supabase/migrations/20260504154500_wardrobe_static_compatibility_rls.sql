alter table if exists public.wardrobe_items
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists brand text,
  add column if not exists color text,
  add column if not exists image_url text,
  add column if not exists ai_attributes jsonb not null default '{}'::jsonb,
  add column if not exists cloudinary_public_id text,
  add column if not exists colors text[] not null default '{}',
  add column if not exists material_tags text[] not null default '{}',
  add column if not exists season_tags text[] not null default '{}',
  add column if not exists subcategory text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table if exists public.wardrobe_items enable row level security;

drop policy if exists "wardrobe items are owner readable" on public.wardrobe_items;
drop policy if exists "wardrobe items are owner insertable" on public.wardrobe_items;
drop policy if exists "wardrobe items are owner updatable" on public.wardrobe_items;

create policy "wardrobe items are owner readable"
on public.wardrobe_items for select
using (auth.uid()::text = user_id::text);

create policy "wardrobe items are owner insertable"
on public.wardrobe_items for insert
with check (auth.uid()::text = user_id::text);

create policy "wardrobe items are owner updatable"
on public.wardrobe_items for update
using (auth.uid()::text = user_id::text)
with check (auth.uid()::text = user_id::text);
