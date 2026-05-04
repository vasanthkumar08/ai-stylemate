# StyleMate AI Production Deployment Checklist

## Pre-Launch QA

- Run `npm ci`.
- Run `npm run qa`.
- Run `npm audit --omit=dev --audit-level=high`.
- Verify `/`, `/login`, `/signup`, `/dashboard`, `/api/health`, `/sitemap.xml`, and `/robots.txt`.
- Test signup, login, logout, forgot password, reset password, and Google auth.
- Upload JPEG, PNG, and WebP wardrobe images.
- Confirm invalid MIME files and oversized files are rejected.
- Generate a recommendation with and without `OPENAI_API_KEY`.
- Confirm `activity_logs` receives anomaly and recommendation logs when `SUPABASE_SERVICE_ROLE_KEY` is configured.

## Vercel

- Import the repository into Vercel.
- Framework preset: Next.js.
- Build command: `npm run build`.
- Install command: `npm ci`.
- Node version: `20.11.0` or newer.
- Set production environment variables:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `CLOUDINARY_UPLOAD_FOLDER`
  - `OPENAI_API_KEY`
  - `OPENAI_VISION_MODEL`
  - `AI_RECOMMENDATION_TIMEOUT_MS`
  - `NEXT_PUBLIC_ANALYTICS_ENABLED`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - `MONITORING_WEBHOOK_URL`
- Configure the production domain and update `NEXT_PUBLIC_APP_URL`.
- Add the production URL to Supabase Auth redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/reset-password`
- Enable Vercel preview deployments for PR QA.

## Supabase

- Create a production Supabase project.
- Apply migrations in order:
  - `20260503160000_stylemate_core_schema.sql`
  - `20260503173000_security_hardening.sql`
- Do not run `supabase/seed.sql` in production unless creating a controlled demo tenant.
- Enable Google provider in Supabase Auth.
- Set Site URL to the production domain.
- Add redirect URLs for local, preview, and production environments.
- Confirm Row Level Security is enabled on all app tables.
- Verify service role key is only stored in Vercel server env vars.
- Review usage limits for free/pro/studio plans.
- Create database backups and PITR if available on the selected Supabase plan.

## Cloudinary

- Create a production Cloudinary cloud.
- Restrict API key access where possible.
- Use `CLOUDINARY_UPLOAD_FOLDER=stylemate-ai`.
- Confirm uploaded assets land under `stylemate-ai/wardrobe/{userId}`.
- Configure transformations and delivery caching.
- Add usage alerts for bandwidth and storage.

## Analytics And Monitoring

- Set `NEXT_PUBLIC_ANALYTICS_ENABLED=true` only after consent/privacy review.
- Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` for Google Analytics.
- Set `MONITORING_WEBHOOK_URL` to a private incident channel or monitoring collector.
- Confirm client errors reach `/api/monitoring/error`.
- Alert on `activity.anomaly` events with severity `high`.

## Security

- Apply `docs/security-report.md` recommendations.
- Verify security headers in production.
- Verify CSP does not block Supabase, Cloudinary, OpenAI, or analytics.
- Move in-memory rate limits to Redis/Upstash before high-traffic launch.
- Rotate all production secrets after initial setup.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, and `OPENAI_API_KEY` server-only.

## Launch

- Deploy to Vercel production.
- Run smoke tests against the production URL.
- Generate a real user session and upload one image.
- Generate one AI outfit recommendation.
- Confirm logs and usage counters update.
- Monitor errors, latency, and rate-limit events for the first 24 hours.
