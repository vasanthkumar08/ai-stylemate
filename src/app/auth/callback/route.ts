import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { applySecurityHeaders } from "@/lib/security/http";

export async function GET(request: NextRequest) {
  console.log("OAuth callback hit");

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/dashboard";

  if (oauthError) {
    console.error("[stylemate-oauth-callback]", {
      error: oauthError,
      description: oauthErrorDescription
    });
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    loginUrl.searchParams.set("reason", oauthErrorDescription || oauthError);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[stylemate-oauth-callback]", {
        error: error.name,
        message: error.message,
        status: error.status
      });
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "oauth");
      loginUrl.searchParams.set("reason", error.message);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    console.log("Session created");
  } else {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    loginUrl.searchParams.set("reason", "OAuth callback did not include a code.");
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  console.log("Redirecting to dashboard");
  return applySecurityHeaders(NextResponse.redirect(new URL(next, requestUrl.origin)));
}
