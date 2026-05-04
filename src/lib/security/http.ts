import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";

const connectSrc =
  process.env.NODE_ENV === "production"
    ? "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com"
    : "connect-src 'self' ws: http: https://*.supabase.co https://api.openai.com https://api.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com";

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' blob: data: https://res.cloudinary.com",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    connectSrc,
    "upgrade-insecure-requests"
  ].join("; ")
};

export function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export function jsonError(message: string, status: number) {
  return applySecurityHeaders(NextResponse.json({ error: message }, { status }));
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  return origin === new URL(env.NEXT_PUBLIC_APP_URL).origin;
}

export function assertApiIntent(request: NextRequest) {
  return request.headers.get("x-stylemate-client") === "web";
}

export function assertTrustedPost(request: NextRequest) {
  return assertSameOrigin(request) && assertApiIntent(request);
}
