alter table if exists public.wardrobe_items enable row level security;

drop policy if exists "wardrobe items are owner deletable" on public.wardrobe_items;

create policy "wardrobe items are owner deletable"
on public.wardrobe_items for delete
using (auth.uid()::text = user_id::text);

