# StyleMate AI Vercel Deployment Checklist

## Required Environment Variables

Set these in Vercel Project Settings before deployment:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_VISION_MODEL`
- `AI_RECOMMENDATION_TIMEOUT_MS`
- `ADMIN_EMAIL_WHITELIST`

Optional production integrations:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `CRON_SECRET`
- `MONITORING_WEBHOOK_URL`
- `NEXT_PUBLIC_ANALYTICS_ENABLED`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

## Supabase

- Apply all migrations in `supabase/migrations`.
- Reload the Supabase PostgREST schema cache after migrations.
- Confirm `wardrobe_items` has owner-only RLS enabled for `SELECT`, `INSERT`, and `UPDATE`.
- Confirm admin users have `role = 'admin'`, `status = 'active'`, and their email is listed in `ADMIN_EMAIL_WHITELIST`.
- Add auth redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-production-domain.com/auth/callback`

## Google OAuth

- Configure Supabase Google provider with production Google OAuth credentials.
- Add authorized redirect URI in Google Cloud:
  - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
- Keep app redirect URLs limited to `/auth/callback?next=/dashboard`.

## Cloudinary

- Use a real API secret in Vercel, never a placeholder.
- Confirm uploads land under `CLOUDINARY_UPLOAD_FOLDER`.

## OpenAI

- Use a project key with write permission for the Responses API.
- If Vision permission is unavailable, StyleMate AI falls back to rule-based scan analysis.

## Validation

Run locally before deploy:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Post-Deploy Smoke Test

- Google sign-in redirects to `/dashboard`.
- Upload a wardrobe item.
- Run AI Scan and confirm save.
- Delete a wardrobe item.
- Generate an outfit.
- Visit `/admin` as an allowed admin.
- Confirm normal users cannot access `/admin`.
