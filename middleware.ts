import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseAuthConfigured } from "@/config/env";
import { CSRF_COOKIE_NAME } from "@/lib/auth/constants";
import { applySecurityHeaders } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getAppUserRole, isActiveAdmin } from "@/roles/service";
import type { Database } from "@/types/database";

const protectedRoutes = ["/dashboard", "/admin", "/outfits", "/scan", "/profile"];
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
const publicApiRoutes = ["/api/health", "/api/stripe/webhook", "/api/cron/reset-usage"];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthPath(pathname: string) {
  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isPublicApiPath(pathname: string) {
  return publicApiRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
}

function rateLimitAuthRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isAuthPath(pathname)) {
    return null;
  }

  const result = checkRateLimit(request, {
    bucket: `auth-page:${pathname}`,
    windowMs: 60_000,
    max: 40
  });

  if (!result.allowed) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Too many authentication requests." }, { status: 429 })
    );
  }

  return null;
}

function needsCsrfCookie(pathname: string) {
  return isAuthPath(pathname) || isProtectedPath(pathname);
}

function setCsrfCookieIfNeeded(request: NextRequest, response: NextResponse) {
  if (!needsCsrfCookie(request.nextUrl.pathname)) {
    return applySecurityHeaders(response);
  }

  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (existingToken) {
    return response;
  }

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

  const targetResponse =
    request.method === "GET" ? NextResponse.redirect(request.nextUrl) : response;

  targetResponse.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60
  });

  return applySecurityHeaders(targetResponse);
}

export async function middleware(request: NextRequest) {
  const rateLimitedResponse = rateLimitAuthRequest(request);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  let response = NextResponse.next({
    request
  });

  const pathname = request.nextUrl.pathname;
  const isOAuthCallback = pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");

  if (isOAuthCallback) {
    return applySecurityHeaders(response);
  }

  if (!isSupabaseAuthConfigured()) {
    if (isApiPath(pathname) && !isPublicApiPath(pathname)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Authentication temporarily unavailable." }, { status: 503 })
      );
    }

    if (isProtectedPath(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "missing-supabase");
      return applySecurityHeaders(NextResponse.redirect(redirectUrl));
    }

    return applySecurityHeaders(response);
  }

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const needsAuthenticatedUser = isProtectedPath(pathname) || (isApiPath(pathname) && !isPublicApiPath(pathname));

  if (needsAuthenticatedUser && !user) {
    if (isApiPath(pathname)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Authentication required." }, { status: 401 })
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  if (user && isAdminPath(pathname)) {
    const appUser = await getAppUserRole(supabase, user);

    if (!isActiveAdmin(appUser)) {
      if (isApiPath(pathname)) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Admin access required." }, { status: 403 })
        );
      }

      return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
  }

  if (isAuthPath(pathname) && user && pathname !== "/reset-password") {
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return setCsrfCookieIfNeeded(request, response);
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"
  ]
};
