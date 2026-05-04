"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CloudSun,
  Filter,
  ImagePlus,
  Layers3,
  Loader2,
  Shirt,
  Sparkles,
  Trash2,
  WandSparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageFade, StaggerGrid, StaggerItem } from "@/components/ui/motion-primitives";
import { useToast } from "@/hooks/use-toast";

export type WardrobeDashboardViewItem = {
  id: string;
  name: string;
  image: string;
  category: string;
  color: string;
  season: string;
  fabric: string;
  brand: string;
  fit: string;
};

type WardrobeDashboardViewProps = {
  items: WardrobeDashboardViewItem[];
  error?: string | null;
};

const categoryFilters = ["All", "Top", "Bottom", "Shoes", "Outerwear"] as const;
const occasionOptions = [
  ["wedding", "Wedding"],
  ["office", "Office"],
  ["party", "Party"],
  ["vacation", "Travel"]
] as const;
const weatherOptions = [
  ["hot", "Hot"],
  ["cold", "Cold"],
  ["rain", "Rainy"]
] as const;

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function displayValue(value: string, fallback: string) {
  return value.trim() || fallback;
}

function matchesCategory(item: WardrobeDashboardViewItem, category: string) {
  if (category === "All") {
    return true;
  }

  return normalize(item.category) === normalize(category);
}

export function WardrobeDashboardView({ items, error }: WardrobeDashboardViewProps) {
  const { toast, ToastViewport } = useToast();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [category, setCategory] = useState<(typeof categoryFilters)[number]>("All");
  const [color, setColor] = useState("All");
  const [season, setSeason] = useState("All");
  const [occasion, setOccasion] = useState<(typeof occasionOptions)[number][0]>("office");
  const [weather, setWeather] = useState<(typeof weatherOptions)[number][0]>("hot");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());

  const visibleSourceItems = useMemo(
    () => items.filter((item) => !deletedIds.has(item.id)),
    [deletedIds, items]
  );

  const colorOptions = useMemo(() => {
    const values = Array.from(new Set(visibleSourceItems.map((item) => item.color).filter(Boolean)));
    return ["All", ...values.sort((a, b) => a.localeCompare(b))];
  }, [visibleSourceItems]);

  const seasonOptions = useMemo(() => {
    const values = Array.from(new Set(visibleSourceItems.map((item) => item.season).filter(Boolean)));
    return ["All", ...values.sort((a, b) => a.localeCompare(b))];
  }, [visibleSourceItems]);

  const filteredItems = useMemo(
    () =>
      visibleSourceItems.filter((item) => {
        const colorMatches = color === "All" || normalize(item.color) === normalize(color);
        const seasonMatches = season === "All" || normalize(item.season) === normalize(season);

        return matchesCategory(item, category) && colorMatches && seasonMatches;
      }),
    [category, color, visibleSourceItems, season]
  );

  async function deleteItem(item: WardrobeDashboardViewItem) {
    if (deletingIds.has(item.id)) {
      return;
    }

    setDeletingIds((current) => new Set(current).add(item.id));
    setDeletedIds((current) => new Set(current).add(item.id));

    try {
      const response = await fetch(`/api/wardrobe/items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { "X-StyleMate-Client": "web" }
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete wardrobe item.");
      }
    } catch (caughtError) {
      setDeletedIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      toast({
        title: "Could not delete item",
        description: caughtError instanceof Error ? caughtError.message : "Please try again.",
        tone: "error"
      });
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function generateOutfit() {
    setIsGenerating(true);
    setRecommendationError(null);
    setRecommendationMessage(null);

    try {
      const response = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StyleMate-Client": "web"
        },
        body: JSON.stringify({
          occasion,
          weather: [weather],
          weatherSummary: weather === "rain" ? "Rainy day" : weather === "cold" ? "Cold weather" : "Hot weather",
          season: season === "All" ? "all-season" : normalize(season),
          stylePreferences: []
        })
      });
      const data = (await response.json()) as {
        error?: string;
        result?: { outfits?: Array<{ stylingExplanation?: string; score?: number }> };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate outfit.");
      }

      const topOutfit = data.result?.outfits?.[0];
      setRecommendationMessage(
        topOutfit?.stylingExplanation ??
          `Generated a ${occasionOptions.find(([value]) => value === occasion)?.[1].toLowerCase()} outfit idea.`
      );
    } catch (caughtError) {
      setRecommendationError(caughtError instanceof Error ? caughtError.message : "Could not generate outfit.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <PageFade className="grid min-w-0 gap-6">
      <ToastViewport />
      <section className="premium-card overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-5 border-b border-[#c6c9e7]/70 bg-[radial-gradient(circle_at_top_right,rgba(168,163,227,0.34),transparent_18rem),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(234,237,254,0.82))] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="ai-active-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI ACTIVE
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">My Wardrobe</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Manage your fashion items</p>
          </div>
          <Button asChild className="gradient-button h-11 px-5 text-white">
            <Link href="/dashboard">
              <ImagePlus className="size-4" aria-hidden="true" />
              Upload Items
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 p-5 sm:p-6">
          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="grid gap-3 rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-4 shadow-sm md:grid-cols-3">
            <label className="grid gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Filter className="size-4 text-[var(--accent)]" aria-hidden="true" />
                Category
              </span>
              <select
                className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
                value={category}
                onChange={(event) => setCategory(event.target.value as typeof category)}
              >
                {categoryFilters.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Color</span>
              <select
                className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              >
                {colorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Season</span>
              <select
                className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
                value={season}
                onChange={(event) => setSeason(event.target.value)}
              >
                {seasonOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Wardrobe Items</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Showing {filteredItems.length} of {visibleSourceItems.length} item{visibleSourceItems.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {visibleSourceItems.length === 0 ? (
            <div className="premium-card grid min-h-[460px] place-items-center rounded-2xl border-dashed p-8 text-center">
              <div className="max-w-sm">
                <div className="relative mx-auto size-24">
                  <div className="absolute inset-0 rounded-3xl bg-[var(--surface-subtle)]" />
                  <div className="absolute left-6 top-5 h-14 w-12 rounded-2xl border border-white/10 bg-white/10 shadow-sm" />
                  <Shirt className="absolute left-8 top-8 size-8 text-[var(--accent)]" aria-hidden="true" />
                  <Sparkles className="absolute right-4 top-3 size-5 text-blue-400" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">Your wardrobe is empty</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Upload your first fashion item to unlock AI outfit planning.
                </p>
                <Button asChild className="gradient-button mt-5 rounded-xl text-white">
                  <Link href="/dashboard">
                    <ImagePlus className="size-4" aria-hidden="true" />
                    Upload first item
                  </Link>
                </Button>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="premium-card grid min-h-80 place-items-center rounded-2xl p-8 text-center">
              <div className="max-w-sm">
                <Layers3 className="mx-auto size-10 text-[var(--accent)]" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold">No matching items</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Adjust category, color, or season to bring more items back into view.
                </p>
              </div>
            </div>
          ) : (
            <StaggerGrid className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <StaggerItem key={item.id}>
                  <article className="group min-w-0 overflow-hidden rounded-2xl border border-[#c6c9e7]/70 bg-white/80 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[var(--shadow-glow)]">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[var(--surface-subtle)] shimmer">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="badge-glow absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize text-[#363b6c] shadow-sm backdrop-blur">
                        {displayValue(item.category, "Item")}
                      </span>
                      <button
                        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-red-600 opacity-0 shadow-sm backdrop-blur transition hover:bg-red-50 group-hover:opacity-100 focus:opacity-100"
                        type="button"
                        onClick={() => void deleteItem(item)}
                        disabled={deletingIds.has(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        {deletingIds.has(item.id) ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <div className="grid gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{item.name}</h3>
                        <p className="mt-1 truncate text-sm text-[var(--muted)]">
                          {[item.brand, item.fabric].filter(Boolean).join(" · ") || "Ready to style"}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <span className="rounded-full border border-[#c6c9e7]/70 bg-white/70 px-2.5 py-1 text-xs font-medium capitalize text-[#64748b]">
                          {displayValue(item.color, "No color")}
                        </span>
                        <span className="rounded-full border border-[#c6c9e7]/70 bg-white/70 px-2.5 py-1 text-xs font-medium capitalize text-[#64748b]">
                          {displayValue(item.fit, "Regular fit")}
                        </span>
                      </div>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </section>

        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <div className="ai-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--accent)]">AI Action</p>
                <h2 className="mt-1 text-xl font-semibold">Generate Outfit</h2>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-[#a8a3e3]/20 text-[#363b6c] shadow-[0_0_24px_rgba(168,163,227,0.28)]">
                <WandSparkles className="size-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Occasion</span>
                <select
                  className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition focus:border-[#363b6c]"
                  value={occasion}
                  onChange={(event) => setOccasion(event.target.value as typeof occasion)}
                >
                  {occasionOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <CloudSun className="size-4 text-[var(--accent)]" aria-hidden="true" />
                  Weather
                </span>
                <select
                  className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition focus:border-[#363b6c]"
                  value={weather}
                  onChange={(event) => setWeather(event.target.value as typeof weather)}
                >
                  {weatherOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                className={isGenerating ? "gradient-button h-12 animate-pulse text-white" : "gradient-button h-12 text-white"}
                disabled={isGenerating || visibleSourceItems.length < 2}
                onClick={() => void generateOutfit()}
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-4" aria-hidden="true" />
                )}
                Generate Outfit
              </Button>

              {visibleSourceItems.length < 2 ? (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Add at least two wardrobe items to generate a complete outfit.
                </p>
              ) : null}

              {recommendationError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {recommendationError}
                </p>
              ) : null}
              {recommendationMessage ? (
                <p className="rounded-xl border border-[#a8a3e3]/50 bg-[#eaedfe] p-3 text-sm leading-6 text-[#363b6c]">
                  {recommendationMessage}
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </PageFade>
  );
}

export function WardrobeDashboardViewSkeleton() {
  return (
    <div className="grid min-w-0 gap-6 animate-pulse">
      <section className="premium-card overflow-hidden rounded-2xl">
        <div className="border-b border-[var(--border)] p-6">
          <div className="h-7 w-40 rounded-full bg-[var(--surface-subtle)]" />
          <div className="mt-4 h-10 w-64 max-w-full rounded bg-[var(--surface-subtle)]" />
          <div className="mt-3 h-4 w-44 rounded bg-[var(--surface-subtle)]" />
        </div>
        <div className="grid gap-3 p-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl bg-[var(--surface-subtle)]" />
          ))}
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-[#c6c9e7]/70 bg-white/70">
              <div className="aspect-[4/5] bg-[var(--surface-subtle)]" />
              <div className="p-4">
                <div className="h-5 rounded bg-[var(--surface-subtle)]" />
                <div className="mt-3 h-4 w-2/3 rounded bg-[var(--surface-subtle)]" />
              </div>
            </div>
          ))}
        </div>
        <div className="premium-card h-80 rounded-2xl" />
      </div>
    </div>
  );
}
