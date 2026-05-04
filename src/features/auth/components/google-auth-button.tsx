"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function getOAuthRedirectTo() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origin = configuredAppUrl ? new URL(configuredAppUrl).origin : window.location.origin;

  return `${origin}/auth/callback?next=/dashboard`;
}

function getConfiguredOrigin() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  return configuredAppUrl ? new URL(configuredAppUrl).origin : window.location.origin;
}

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle() {
    setIsLoading(true);

    try {
      const configuredOrigin = getConfiguredOrigin();

      if (window.location.origin !== configuredOrigin) {
        window.location.href = `${configuredOrigin}/login`;
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectTo(),
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
      disabled={isLoading}
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
      Continue with Google
    </Button>
  );
}
