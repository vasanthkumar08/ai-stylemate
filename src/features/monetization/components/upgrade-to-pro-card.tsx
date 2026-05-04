"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";

type Usage = {
  plan: "free" | "pro";
  dailyOutfitLimit: number | null;
  outfitsUsedToday: number;
  aiScanLimit: number | null;
  aiScansUsedToday: number;
  remainingOutfits: number | null;
  remainingScans: number | null;
};

function percent(used: number, limit: number | null) {
  if (!limit) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const value = percent(used, limit);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--muted)]">{label}</span>
        <span className="font-semibold">{limit === null ? "Unlimited" : `${Math.max(0, limit - used)} left`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function UpgradeToProCard() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUsage() {
      const response = await fetch("/api/monetization/usage", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { usage?: Usage };

      if (active && response.ok && data.usage) {
        setUsage(data.usage);
      }
    }

    void loadUsage();

    return () => {
      active = false;
    };
  }, []);

  if (!usage) {
    return <div className="premium-card h-56 animate-pulse rounded-2xl shimmer" />;
  }

  const isPro = usage.plan === "pro";

  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Plan usage</p>
          <h2 className="mt-1 text-lg font-semibold">{isPro ? "Pro plan active" : "Upgrade to Pro"}</h2>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-200 shadow-[0_0_24px_rgba(168,85,247,0.16)]">
          {isPro ? <Crown className="size-5" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <UsageBar label="Outfits today" used={usage.outfitsUsedToday} limit={usage.dailyOutfitLimit} />
        <UsageBar label="AI scans today" used={usage.aiScansUsedToday} limit={usage.aiScanLimit} />
      </div>

      {!isPro ? (
        <>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Smart Upgrade unlocks unlimited outfits, unlimited scans, advanced AI recommendations, and priority responses.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold">
              <span>Feature</span>
              <span>Free</span>
              <span>Pro</span>
            </div>
            {[
              ["Outfits", "3/day", "Unlimited"],
              ["AI scans", "10/day", "Unlimited"],
              ["Styling", "Basic", "Premium AI"]
            ].map(([feature, free, pro]) => (
              <div key={feature} className="grid grid-cols-3 border-b border-white/10 px-3 py-2 text-xs last:border-0">
                <span className="font-medium">{feature}</span>
                <span className="text-[var(--muted)]">{free}</span>
                <span className="font-semibold text-[var(--accent)]">{pro}</span>
              </div>
            ))}
          </div>
          <UpgradeButton className="mt-4 w-full" />
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          You have unlimited outfit generation, scans, priority response, and better styling suggestions.
        </p>
      )}
    </section>
  );
}
