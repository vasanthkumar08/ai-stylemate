# StyleMate AI Security Audit Report

Audit date: 2026-05-03

## Summary

The project was reviewed for XSS, SQL injection, authentication failures, insecure uploads, API abuse, rate-limit bypass, and privilege escalation. The highest-risk finding was client-side privilege escalation on `public.users` because authenticated users could update their own `role`, `status`, and `deleted_at` fields under the existing RLS policy. This has been fixed with a database trigger migration.

## Fixes Applied

- Added global security headers through middleware and API responses:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Resource-Policy`
- Added shared API POST protection requiring same-origin requests and `X-StyleMate-Client: web`.
- Added shared IP/user-agent rate limiting utility.
- Added user-scoped rate limits for authenticated upload and recommendation APIs.
- Added anomaly logging utility for suspicious requests and validation failures.
- Added migration `20260503173000_security_hardening.sql`:
  - Blocks client changes to `users.role`, `users.status`, and `users.deleted_at`.
  - Changes activity log insertion to service-role only.
  - Adds `activity.anomaly` event type.
- Hardened wardrobe uploads:
  - Server-side MIME allowlist.
  - File size limit.
  - Magic-byte signature validation for JPEG, PNG, and WebP.
  - Sanitized metadata before persistence.
  - Generic API errors to avoid backend detail leakage.
  - Upload quota enforcement.
- Hardened recommendation generation:
  - Same-origin + client intent header.
  - IP and user-level rate limits.
  - Sanitized user-controlled text inputs.
  - Generic database failure responses.
  - Anomaly logs for abuse attempts.
- Hardened auth:
  - Auth callback responses now include security headers.
  - Signup metadata is sanitized.
  - Protected routes return `503` instead of opening if Supabase auth is not configured.

## Findings

### XSS

Status: Mitigated

No direct `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or dynamic script execution was found in app code. React escaping protects normal text rendering. Sanitization was added for user-provided text before storing signup, upload, and recommendation inputs. CSP and `X-Content-Type-Options` were added to reduce browser execution risk.

Residual risk: AI-generated text is displayed as text and escaped by React, but future rich-text rendering must sanitize HTML with an allowlist sanitizer.

### SQL Injection

Status: Low risk

No raw SQL string construction was found in API routes. Database access uses Supabase query builders. User inputs are validated with Zod and parameterized through the client library.

Residual risk: Future RPC functions or raw SQL migrations should avoid string concatenation and use typed arguments.

### Broken Auth

Status: Mitigated

Middleware validates sessions with `supabase.auth.getUser()` and protects `/dashboard`. Protected routes now fail closed if Supabase auth env vars are missing. Auth forms use CSRF tokens and same-origin checks.

Residual risk: Auth rate limiting is in-memory and should move to Redis/Upstash or a durable store for multi-instance deployments.

### Insecure Uploads

Status: Mitigated

Uploads now validate MIME type, size, and file signature before Cloudinary upload. Metadata is sanitized. Cloudinary and Supabase errors are logged server-side but not exposed to users.

Residual risk: For very high-risk environments, add image dimension checks and malware scanning through a dedicated scanning service before making images public.

### API Abuse And Rate Limit Bypass

Status: Improved

Shared rate limiting now applies by IP/user-agent before auth and by user ID after auth for upload and recommendation endpoints. Usage limits also enforce monthly upload and recommendation quotas.

Residual risk: In-memory rate limits reset per process and can be bypassed across multiple server instances. Production should use a distributed limiter keyed by IP, user ID, and route.

### Privilege Escalation

Status: Fixed

The `users` table RLS policy previously allowed users to update their own row, including privileged fields. The new migration prevents client-side updates to `role`, `status`, and `deleted_at` unless the request uses the service role.

### Logging And Anomaly Detection

Status: Added

Suspicious events are logged to the server console and, when `SUPABASE_SERVICE_ROLE_KEY` is configured, persisted to `activity_logs` as `activity.anomaly`. Events include untrusted POSTs, MIME mismatches, oversized uploads, invalid MIME types, and rate-limit violations.

## Production Recommendations

- Move rate limiting to Redis/Upstash or Supabase-backed counters.
- Apply the new Supabase migration before production use.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Configure Cloudinary upload presets/folders with least privilege.
- Add centralized log alerting for `activity.anomaly` severity `high`.
- Consider a strict nonce-based CSP if you later add custom inline scripts.
