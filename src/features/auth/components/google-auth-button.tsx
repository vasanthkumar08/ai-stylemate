"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePostAuthRedirect } from "@/lib/auth/redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type GoogleAuthButtonProps = {
  nextPath?: string;
};

function getOAuthRedirectTo(nextPath: string) {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", normalizePostAuthRedirect(nextPath));

  return callbackUrl.toString();
}

export function GoogleAuthButton({ nextPath = "/dashboard" }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isAuthConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function signInWithGoogle() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = getOAuthRedirectTo(nextPath);

      console.info("[stylemate-oauth-start]", {
        provider: "google",
        next: normalizePostAuthRedirect(nextPath),
        origin: window.location.origin
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account"
          }
        }
      });

      if (error) {
        console.error("[stylemate-google-oauth]", error.message);
        window.location.href = `/login?error=oauth&reason=${encodeURIComponent(error.message)}`;
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Could not start Google OAuth.";
      console.error("[stylemate-google-oauth]", message);
      window.location.href = `/login?error=oauth&reason=${encodeURIComponent(message)}`;
    }
  }

  return (
    <Button
      className="w-full"
      disabled={isLoading || !isAuthConfigured}
      size="lg"
      type="button"
      variant="secondary"
      onClick={() => void signInWithGoogle()}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <span className="text-base font-semibold" aria-hidden="true">
          G
        </span>
      )}
      {isAuthConfigured ? "Continue with Google" : "Authentication temporarily unavailable"}
    </Button>
  );
}
