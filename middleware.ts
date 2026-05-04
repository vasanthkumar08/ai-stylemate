import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseAuthConfigured } from "@/config/env";
import { CSRF_COOKIE_NAME } from "@/lib/auth/constants";
import { normalizePostAuthRedirect } from "@/lib/auth/redirect";
import { applySecurityHeaders } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getAppUserRole, isActiveAdmin } from "@/roles/service";
import type { Database } from "@/types/database";

const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/wardrobe",
  "/outfits",
  "/scan",
  "/profile",
  "/account"
];
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
const publicRoutes = ["/", "/login", "/signup", "/pricing", "/about"];
const publicApiRoutes = [
  "/api/public",
  "/api/health",
  "/api/stripe/webhook",
  "/api/cron/reset-usage"
];
const publicAssetPaths = new Set([
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/robots.txt",
  "/sitemap.xml"
]);
const publicAssetPrefixes = ["/_next/", "/icons/", "/images/", "/fonts/", "/public/"];

function isLocalDevelopmentHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isVercelPreviewHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  return normalized.includes("git-") && normalized.includes(".vercel.app");
}

function getRequestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = forwardedHost?.split(",")[0]?.trim() || request.nextUrl.hostname;

  return host.split(":")[0]?.toLowerCase() || request.nextUrl.hostname.toLowerCase();
}

function hasFileExtension(pathname: string) {
  return /\/[^/]+\.[^/]+$/.test(pathname);
}

function isPublicAssetPath(pathname: string) {
  return (
    publicAssetPaths.has(pathname) ||
    publicAssetPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    hasFileExtension(pathname)
  );
}

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
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

function originalPathWithSearch(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function getPreviewDomainRedirect(request: NextRequest) {
  const hostname = getRequestHostname(request);

  if (
    isLocalDevelopmentHost(hostname) ||
    !isVercelPreviewHost(hostname) ||
    isPublicAssetPath(request.nextUrl.pathname)
  ) {
    return null;
  }

  const productionUrl = new URL(env.NEXT_PUBLIC_APP_URL);
  const productionHostname = productionUrl.hostname.toLowerCase();

  if (isLocalDevelopmentHost(productionHostname) || productionHostname === hostname) {
    return null;
  }

  productionUrl.pathname = request.nextUrl.pathname;
  productionUrl.search = request.nextUrl.search;

  return productionUrl;
}

function logMiddlewareBypass(request: NextRequest, reason: string) {
  console.info("[stylemate-middleware-bypass]", {
    path: request.nextUrl.pathname,
    reason
  });
}

function logMiddlewareAuthState(
  request: NextRequest,
  state: {
    action: string;
    authenticated: boolean;
    protectedPath: boolean;
    authPath: boolean;
    apiPath: boolean;
  }
) {
  if (!state.protectedPath && !state.authPath && !state.apiPath) {
    return;
  }

  console.info("[stylemate-middleware-auth]", {
    path: request.nextUrl.pathname,
    action: state.action,
    authenticated: state.authenticated,
    protectedPath: state.protectedPath,
    authPath: state.authPath,
    apiPath: state.apiPath
  });
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

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60
  });

  return applySecurityHeaders(response);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  console.info("[stylemate-middleware]", {
    pathname
  });

  const previewRedirectUrl = getPreviewDomainRedirect(request);

  if (previewRedirectUrl) {
    return applySecurityHeaders(NextResponse.redirect(previewRedirectUrl));
  }

  if (isPublicAssetPath(pathname)) {
    logMiddlewareBypass(request, "public-asset");
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  if (isPublicApiPath(pathname)) {
    logMiddlewareBypass(request, "public-api");
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  const rateLimitedResponse = rateLimitAuthRequest(request);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  let response = NextResponse.next({
    request
  });

  const isOAuthCallback = pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");
  const protectedPath = isProtectedPath(pathname);
  const publicPath = isPublicRoute(pathname);
  const authPath = isAuthPath(pathname);
  const apiPath = isApiPath(pathname);

  console.info("[stylemate-middleware-protected-check]", {
    pathname,
    protectedPath,
    publicPath,
    apiPath
  });

  if (isOAuthCallback) {
    return applySecurityHeaders(response);
  }

  if (!isSupabaseAuthConfigured()) {
    if (apiPath && !isPublicApiPath(pathname)) {
      logMiddlewareAuthState(request, {
        action: "missing-auth-config-api",
        authenticated: false,
        protectedPath,
        authPath,
        apiPath
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Authentication temporarily unavailable." }, { status: 503 })
      );
    }

    if (protectedPath) {
      logMiddlewareAuthState(request, {
        action: "missing-auth-config-protected",
        authenticated: false,
        protectedPath,
        authPath,
        apiPath
      });
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
  const authenticated = Boolean(user);
  const needsAuthenticatedUser = protectedPath || (apiPath && !isPublicApiPath(pathname));

  if (needsAuthenticatedUser && !user) {
    logMiddlewareAuthState(request, {
      action: "guest-redirect",
      authenticated,
      protectedPath,
      authPath,
      apiPath
    });

    if (isApiPath(pathname)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Authentication required." }, { status: 401 })
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", normalizePostAuthRedirect(originalPathWithSearch(request)));
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

  if (authPath && user && pathname !== "/reset-password" && !request.nextUrl.searchParams.has("next")) {
    logMiddlewareAuthState(request, {
      action: "authenticated-auth-page-redirect",
      authenticated,
      protectedPath,
      authPath,
      apiPath
    });
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  logMiddlewareAuthState(request, {
    action: "pass",
    authenticated,
    protectedPath,
    authPath,
    apiPath
  });

  return setCsrfCookieIfNeeded(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/|icons/|images/|fonts/|public/|api/public/|manifest\\.webmanifest$|favicon\\.ico$|icon\\.png$|icon-192\\.png$|icon-512\\.png$|apple-icon\\.png$|robots\\.txt$|sitemap\\.xml$|.*\\.[^/]+$).*)"
  ]
};
