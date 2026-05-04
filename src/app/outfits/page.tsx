import { AppShell } from "@/components/layout/app-shell";
import { OutfitRecommendationPanel } from "@/features/recommendations/components/outfit-recommendation-panel";
import { requireAuthenticatedPage } from "@/lib/guards/server";

export const dynamic = "force-dynamic";

export default async function OutfitsPage() {
  await requireAuthenticatedPage();

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-[var(--accent)]">AI outfit studio</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Outfits</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Generate complete looks from your wardrobe, weather, and style context.
          </p>
        </div>
        <OutfitRecommendationPanel />
      </section>
    </AppShell>
  );
}
