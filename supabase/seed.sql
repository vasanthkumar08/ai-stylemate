-- Local development seed data for StyleMate AI.
-- The demo auth user works with Supabase local development. Password: StyleMate123!

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@stylemate.ai',
  extensions.crypt('StyleMate123!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Demo Stylist","display_name":"Demo Stylist"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id, email, full_name)
values ('11111111-1111-4111-8111-111111111111', 'demo@stylemate.ai', 'Demo Stylist')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name;

insert into public.profiles (
  user_id,
  display_name,
  username,
  location,
  body_type,
  height_cm,
  measurements,
  onboarding_completed_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  'Demo Stylist',
  'demo_stylist',
  'New York, NY',
  'athletic',
  170,
  '{"chest_cm": 91, "waist_cm": 74, "hips_cm": 96}'::jsonb,
  now()
)
on conflict (user_id) do update
set display_name = excluded.display_name,
    username = excluded.username,
    location = excluded.location,
    body_type = excluded.body_type,
    height_cm = excluded.height_cm,
    measurements = excluded.measurements,
    onboarding_completed_at = excluded.onboarding_completed_at;

insert into public.style_preferences (
  user_id,
  style_personas,
  favorite_colors,
  avoided_colors,
  preferred_fits,
  disliked_materials,
  climate_preferences,
  occasion_weights,
  budget_min,
  budget_max,
  ai_notes
)
values (
  '11111111-1111-4111-8111-111111111111',
  array['minimal', 'smart casual', 'travel ready'],
  array['black', 'white', 'olive', 'denim blue'],
  array['neon yellow'],
  array['tailored', 'relaxed'],
  array['itchy wool'],
  '{"runs_cold": true, "prefers_layers": true}'::jsonb,
  '{"work": 0.4, "weekend": 0.35, "travel": 0.25}'::jsonb,
  50,
  250,
  'Prefers polished outfits that still work for walking-heavy days.'
)
on conflict (user_id) do update
set style_personas = excluded.style_personas,
    favorite_colors = excluded.favorite_colors,
    avoided_colors = excluded.avoided_colors,
    preferred_fits = excluded.preferred_fits,
    disliked_materials = excluded.disliked_materials,
    climate_preferences = excluded.climate_preferences,
    occasion_weights = excluded.occasion_weights,
    budget_min = excluded.budget_min,
    budget_max = excluded.budget_max,
    ai_notes = excluded.ai_notes;

insert into public.wardrobe_items (
  id,
  user_id,
  name,
  category,
  subcategory,
  brand,
  size_label,
  colors,
  season_tags,
  occasion_tags,
  material_tags,
  image_url,
  cloudinary_public_id,
  purchase_price,
  ai_attributes
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111111',
    'White Oxford Shirt',
    'top',
    'button-down',
    'Everlane',
    'M',
    array['white'],
    array['spring', 'summer', 'fall'],
    array['work', 'dinner', 'travel'],
    array['cotton'],
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'stylemate/demo/white-oxford-shirt',
    88,
    '{"formality": 0.72, "pattern": "solid", "layerable": true}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111111',
    'Dark Straight Jeans',
    'bottom',
    'jeans',
    'Levi''s',
    '30',
    array['indigo'],
    array['fall', 'winter', 'spring'],
    array['casual', 'travel', 'weekend'],
    array['denim'],
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'stylemate/demo/dark-straight-jeans',
    98,
    '{"formality": 0.42, "pattern": "solid", "stretch": "medium"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111111',
    'Olive Utility Jacket',
    'outerwear',
    'light jacket',
    'Madewell',
    'M',
    array['olive'],
    array['spring', 'fall'],
    array['casual', 'travel'],
    array['cotton twill'],
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'stylemate/demo/olive-utility-jacket',
    148,
    '{"formality": 0.38, "pattern": "solid", "weather": "light wind"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.outfit_recommendations (
  id,
  user_id,
  request_hash,
  occasion,
  season,
  weather_context,
  destination,
  prompt,
  item_ids,
  response,
  score,
  model_name,
  status
)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'demo-weekend-nyc-spring',
  'weekend city walk',
  'spring',
  '{"temp_c": 18, "condition": "partly cloudy", "wind_kph": 12}'::jsonb,
  'New York, NY',
  'Create a polished casual outfit for a spring city walk.',
  array[
    '22222222-2222-4222-8222-222222222201'::uuid,
    '22222222-2222-4222-8222-222222222202'::uuid,
    '22222222-2222-4222-8222-222222222203'::uuid
  ],
  '{"summary": "Crisp shirt, dark denim, and a light utility jacket.", "reasoning": ["Layered for wind", "Neutral colors match user preferences"]}'::jsonb,
  0.91,
  'stylemate-demo-model',
  'accepted'
)
on conflict (id) do nothing;

insert into public.saved_outfits (
  id,
  user_id,
  recommendation_id,
  name,
  notes,
  occasion,
  item_ids,
  cover_image_url,
  is_favorite,
  planned_for,
  rating
)
values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Spring City Walk',
  'Easy default for errands, lunch, and light travel days.',
  'weekend city walk',
  array[
    '22222222-2222-4222-8222-222222222201'::uuid,
    '22222222-2222-4222-8222-222222222202'::uuid,
    '22222222-2222-4222-8222-222222222203'::uuid
  ],
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  true,
  current_date + 7,
  5
)
on conflict (id) do nothing;

insert into public.usage_limits (
  user_id,
  period_start,
  period_end,
  recommendations_used,
  recommendations_limit,
  uploads_used,
  uploads_limit,
  storage_bytes_used,
  storage_bytes_limit
)
values (
  '11111111-1111-4111-8111-111111111111',
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
  1,
  20,
  3,
  100,
  15728640,
  1073741824
)
on conflict (user_id, period_start) do update
set recommendations_used = excluded.recommendations_used,
    recommendations_limit = excluded.recommendations_limit,
    uploads_used = excluded.uploads_used,
    uploads_limit = excluded.uploads_limit,
    storage_bytes_used = excluded.storage_bytes_used,
    storage_bytes_limit = excluded.storage_bytes_limit;

insert into public.subscriptions (
  id,
  user_id,
  tier,
  status,
  provider,
  provider_customer_id,
  current_period_start,
  current_period_end,
  metadata
)
values (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  'free',
  'active',
  'manual',
  'demo-customer',
  now(),
  now() + interval '1 month',
  '{"source": "seed"}'::jsonb
)
on conflict (id) do update
set tier = excluded.tier,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    metadata = excluded.metadata;

insert into public.activity_logs (
  user_id,
  event_type,
  entity_type,
  entity_id,
  metadata
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'wardrobe.created',
    'wardrobe_items',
    '22222222-2222-4222-8222-222222222201',
    '{"source": "seed"}'::jsonb
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'recommendation.generated',
    'outfit_recommendations',
    '33333333-3333-4333-8333-333333333333',
    '{"source": "seed"}'::jsonb
  );
