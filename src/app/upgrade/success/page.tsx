import Link from "next/link";
import { CheckCircle2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeSuccessRedirect } from "@/features/billing/components/upgrade-success-redirect";

export default function UpgradeSuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 py-12">
      <UpgradeSuccessRedirect />
      <section className="w-full max-w-lg rounded-xl border border-blue-100 bg-white p-8 text-center shadow-xl shadow-blue-950/10">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-[var(--accent)] text-white">
          <Crown className="size-7" aria-hidden="true" />
        </span>
        <CheckCircle2 className="mx-auto mt-6 size-8 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Welcome to StyleMate Pro</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Your payment is being confirmed by Stripe. Pro access activates from the verified webhook, then your wardrobe gets unlimited outfits and scans.
        </p>
        <Button asChild className="mt-6 bg-[var(--accent)] hover:bg-blue-700">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <p className="mt-3 text-xs text-[var(--muted)]">Redirecting to dashboard shortly.</p>
      </section>
    </main>
  );
}
