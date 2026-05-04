import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { normalizePostAuthRedirect } from "@/lib/auth/redirect";
import { applySecurityHeaders } from "@/lib/security/http";
import { sanitizeText } from "@/lib/security/sanitize";

function stringMetadata(value: unknown) {
  return typeof value === "string" ? sanitizeText(value, 160) : null;
}

async function ensureAppUserProfile(supabase: Awaited<ReturnType<typeof createSupabaseRouteHandlerClient>>) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error };
  }

  const fullName =
    stringMetadata(user.user_metadata?.full_name) ??
    stringMetadata(user.user_metadata?.name) ??
    stringMetadata(user.user_metadata?.display_name);
  const avatarUrl =
    stringMetadata(user.user_metadata?.avatar_url) ??
    stringMetadata(user.user_metadata?.picture);

  if (user.email) {
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        last_sign_in_at: new Date().toISOString(),
        ...(fullName ? { full_name: fullName } : {}),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {})
      },
      { onConflict: "id" }
    );

    if (userError) {
      console.error("[stylemate-oauth-callback]", {
        step: "app-user-upsert",
        code: userError.code,
        message: userError.message
      });
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      ...(fullName ? { display_name: fullName } : {}),
      ...(avatarUrl ? { preferred_avatar_url: avatarUrl } : {})
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    console.error("[stylemate-oauth-callback]", {
      step: "profile-upsert",
      code: profileError.code,
      message: profileError.message
    });
  }

  return { user, error: null };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");
  const next = normalizePostAuthRedirect(requestUrl.searchParams.get("next"));

  console.info("[stylemate-oauth-callback]", {
    step: "start",
    hasCode: Boolean(code),
    hasProviderError: Boolean(oauthError),
    redirectTarget: next
  });

  if (oauthError) {
    console.error("[stylemate-oauth-callback]", {
      error: oauthError,
      description: oauthErrorDescription
    });
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    loginUrl.searchParams.set("reason", oauthErrorDescription || oauthError);
    loginUrl.searchParams.set("next", next);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const supabase = await createSupabaseRouteHandlerClient();

  if (code) {
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
      loginUrl.searchParams.set("next", next);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    console.info("[stylemate-oauth-callback]", {
      step: "session-created",
      redirectTarget: next
    });
  } else {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    loginUrl.searchParams.set("reason", "OAuth callback did not include a code.");
    loginUrl.searchParams.set("next", next);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const { user, error } = await ensureAppUserProfile(supabase);

  if (error || !user) {
    console.error("[stylemate-oauth-callback]", {
      step: "session-validate",
      message: error?.message ?? "Missing user after OAuth session exchange."
    });
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth");
    loginUrl.searchParams.set("reason", "Session could not be validated.");
    loginUrl.searchParams.set("next", next);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  console.info("[stylemate-oauth-callback]", {
    step: "redirect",
    authenticated: true,
    redirectTarget: next
  });

  return applySecurityHeaders(NextResponse.redirect(new URL(next, requestUrl.origin)));
}
