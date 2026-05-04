"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UpgradeButton({ className, disabled = false }: { className?: string; disabled?: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StyleMate-Client": "web"
        },
        body: JSON.stringify({})
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }

      window.location.assign(data.url);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start checkout.");
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button className={cn("gradient-button text-white", className)} disabled={disabled || isLoading} onClick={() => void startCheckout()}>
        {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        {disabled ? "Billing unavailable" : "Upgrade Now"}
      </Button>
      {error ? <p className="text-xs leading-5 text-red-600">{error}</p> : null}
    </div>
  );
}
