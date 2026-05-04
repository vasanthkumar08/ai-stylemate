import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScanDisabledCard({
  isPro,
  reason = "feature"
}: {
  isPro: boolean;
  reason?: "env" | "feature";
}) {
  const isEnvUnavailable = reason === "env";

  return (
    <section className="premium-card mx-auto grid min-h-[520px] max-w-3xl place-items-center rounded-2xl p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20">
          <Lock className="size-7" aria-hidden="true" />
        </span>
        <p className="ai-active-badge mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {isEnvUnavailable ? "Service unavailable" : "Feature coming soon"}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {isEnvUnavailable ? "AI scan unavailable" : "AI Scan is currently disabled"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {isEnvUnavailable
            ? "AI scan is disabled until the required production services are configured."
            : isPro
            ? "Your Pro plan can use AI Scan once the workspace refreshes. If this keeps showing, ask an admin to verify the feature flag."
            : "Free users can access AI Scan after an admin enables the feature. Upgrade to Pro to unlock AI Scan when premium access is active."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="gradient-button text-white">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          {!isPro ? (
            <Button asChild variant="secondary">
              <Link href="/dashboard">View Pro benefits</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
