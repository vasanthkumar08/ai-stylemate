# StyleMate AI Database Schema

This schema uses Supabase Auth as the identity provider and `public.users` as the application-facing user table. Every product table is scoped by `user_id`, has UUID primary keys, `created_at`, `updated_at`, `deleted_at`, owner-scoped row level security, and partial indexes that ignore soft-deleted rows.

## Relationships

- `auth.users` to `public.users`: one-to-one. `public.users.id` references `auth.users.id`, so the app has a stable user record while Supabase Auth remains the login source.
- `users` to `profiles`: one-to-one. A profile stores public-facing and onboarding information for the user.
- `users` to `style_preferences`: one-to-one. Preferences are separated from the profile because they are queried by recommendation workflows and may grow independently.
- `users` to `wardrobe_items`: one-to-many. Each user can upload many clothing items. Array and JSONB GIN indexes support filtering by colors, seasons, occasions, and AI attributes.
- `users` to `outfit_recommendations`: one-to-many. Each recommendation belongs to the requesting user and stores the request context, model response, score, and selected wardrobe item IDs.
- `outfit_recommendations` to `saved_outfits`: one-to-many optional. A saved outfit can point back to the generated recommendation that created it, but the link is nullable so saved outfits survive if a recommendation is archived or removed.
- `users` to `saved_outfits`: one-to-many. Saved outfits are user-owned collections of wardrobe item IDs with planning, rating, and favorite metadata.
- `users` to `usage_limits`: one-to-many by billing period. A unique `(user_id, period_start)` constraint ensures one usage counter per user per period.
- `users` to `subscriptions`: one-to-many historically, with a partial unique index enforcing only one currently active subscription per user.
- `users` to `activity_logs`: one-to-many. Logs are append-oriented audit records. `user_id` is nullable with `on delete set null` so security and operational events can survive user deletion when required.

## Scalability Notes

- Query paths are user-first: most indexes begin with `user_id` and include sort keys like `created_at desc`.
- Soft-delete aware partial indexes keep common reads small: `where deleted_at is null`.
- GIN indexes support array membership and JSONB containment filters without full table scans.
- `activity_logs` has a BRIN index on `created_at`, which is efficient for large append-only time-series style tables.
- RLS policies keep client access owner-scoped. Billing and quota mutation tables are service-managed to prevent client-side tampering.
- For very large deployments, `activity_logs`, `outfit_recommendations`, and `wardrobe_items` are the first candidates for monthly or hash partitioning by `created_at` or `user_id`.

## Files

- Migration: `supabase/migrations/20260503160000_stylemate_core_schema.sql`
- Seed data: `supabase/seed.sql`
