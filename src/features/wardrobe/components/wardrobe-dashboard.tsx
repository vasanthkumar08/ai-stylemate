"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageFade, StaggerGrid, StaggerItem } from "@/components/ui/motion-primitives";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type WardrobeDashboardItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  colors: string[];
  season_tags: string[];
  material_tags: string[];
  image_url: string;
  created_at: string;
};

const filters = [
  { label: "All", value: "all" },
  { label: "Shirt", value: "shirt" },
  { label: "T-shirt", value: "t-shirt" },
  { label: "Jeans", value: "jeans" },
  { label: "Blazer", value: "blazer" },
  { label: "Shoes", value: "shoes" },
  { label: "Accessories", value: "accessories" }
] as const;

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Name A-Z", value: "name" },
  { label: "Category", value: "category" }
] as const;

const pageSize = 8;

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function itemHaystack(item: WardrobeDashboardItem) {
  return normalize(
    [
      item.name,
      item.category,
      item.subcategory,
      item.brand,
      ...item.colors,
      ...item.season_tags,
      ...item.material_tags
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function filterMatches(item: WardrobeDashboardItem, filter: string) {
  if (filter === "all") {
    return true;
  }

  const haystack = itemHaystack(item);

  if (filter === "accessories") {
    return (
      haystack.includes("accessory") ||
      haystack.includes("jewelry") ||
      haystack.includes("bag") ||
      haystack.includes("watch")
    );
  }

  if (filter === "t-shirt") {
    return haystack.includes("t-shirt") || haystack.includes("tee") || haystack.includes("tshirt");
  }

  return haystack.includes(filter);
}

export function WardrobeDashboard({ items }: { items: WardrobeDashboardItem[] }) {
  const router = useRouter();
  const { toast, ToastViewport } = useToast();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleSourceItems = useMemo(
    () => items.filter((item) => !deletedIds.has(item.id)),
    [deletedIds, items]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);

    return visibleSourceItems
      .filter((item) => filterMatches(item, activeFilter))
      .filter((item) => !normalizedQuery || itemHaystack(item).includes(normalizedQuery))
      .sort((a, b) => {
        if (sort === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }

        if (sort === "name") {
          return a.name.localeCompare(b.name);
        }

        if (sort === "category") {
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activeFilter, visibleSourceItems, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  function resetToFirstPage() {
    setPage(1);
  }

  async function deleteItem(item: WardrobeDashboardItem) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(`Delete "${item.name}" from your wardrobe?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);

    try {
      const response = await fetch(`/api/wardrobe/items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { "X-StyleMate-Client": "web" }
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete wardrobe item.");
      }

      setDeletedIds((current) => new Set(current).add(item.id));
      toast({ title: "Wardrobe item deleted", description: `${item.name} was removed.`, tone: "success" });
      router.refresh();
    } catch (caughtError) {
      toast({
        title: "Could not delete item",
        description: caughtError instanceof Error ? caughtError.message : "Please try again.",
        tone: "error"
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageFade className="min-w-0">
      <ToastViewport />
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--accent)]">Wardrobe intelligence</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--foreground)]">Style workspace</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Browse, filter, and organize uploaded wardrobe pieces before generating complete looks.
        </p>
      </div>

      <div className="premium-card rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative min-w-0">
            <span className="sr-only">Search wardrobe</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="h-11 w-full min-w-0 rounded-xl border border-[#c6c9e7]/80 bg-white/80 pl-10 pr-3 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
              placeholder="Search by name, brand, color, fabric..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetToFirstPage();
              }}
            />
          </label>

          <label className="grid gap-1">
            <span className="sr-only">Sort wardrobe</span>
            <select
              className="h-11 w-full rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                resetToFirstPage();
              }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition hover:-translate-y-0.5",
                activeFilter === filter.value
                  ? "badge-glow border-[var(--accent)] bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  : "border-[#c6c9e7]/80 bg-white/70 text-[#111827] hover:bg-white"
              )}
              type="button"
              onClick={() => {
                setActiveFilter(filter.value);
                resetToFirstPage();
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <p>
          Showing {visibleItems.length} of {filteredItems.length} item
          {filteredItems.length === 1 ? "" : "s"}
        </p>
        <p>
          Page {safePage} of {totalPages}
        </p>
      </div>

      {visibleSourceItems.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No wardrobe items yet"
            description="Upload your first clothing item to begin building outfit recommendations."
          />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No matching wardrobe items"
            description="Try a different search, filter, or sort option."
          />
        </div>
      ) : (
        <StaggerGrid className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleItems.map((item) => (
            <StaggerItem key={item.id}>
              <article className="group min-w-0 overflow-hidden rounded-2xl border border-[#c6c9e7]/60 bg-white/80 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
                <div className="relative aspect-[4/5] bg-[var(--surface-subtle)] shimmer">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <button
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-red-600 opacity-0 shadow-sm backdrop-blur transition hover:bg-red-50 group-hover:opacity-100 focus:opacity-100"
                    type="button"
                    onClick={() => void deleteItem(item)}
                    disabled={deletingId === item.id}
                    aria-label={`Delete ${item.name}`}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div className="min-w-0 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{item.name}</h2>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {[item.brand, item.subcategory ?? item.category].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="badge-glow shrink-0 rounded-full bg-[#eaedfe] px-2 py-1 text-xs font-semibold text-[#363b6c]">
                      {item.category}
                    </span>
                  </div>
                  <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                    {[...item.colors, ...item.season_tags, ...item.material_tags].slice(0, 4).map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="max-w-full truncate rounded-full border border-[#c6c9e7]/70 bg-white/70 px-2 py-1 text-xs text-[#64748b]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          disabled={safePage <= 1}
          variant="secondary"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;

            return (
              <button
                key={pageNumber}
                className={cn(
                  "size-9 rounded-lg border text-sm font-medium transition",
                  safePage === pageNumber
                    ? "border-[var(--accent)] bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                    : "border-[#c6c9e7]/70 bg-white/70 text-[#64748b] hover:bg-white"
                )}
                type="button"
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
        <Button
          disabled={safePage >= totalPages}
          variant="secondary"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </PageFade>
  );
}

export function WardrobeDashboardSkeleton() {
  return (
    <section className="min-w-0 animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-36 rounded bg-[var(--surface-subtle)]" />
        <div className="mt-3 h-9 w-64 max-w-full rounded bg-[var(--surface-subtle)]" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-[var(--surface-subtle)]" />
      </div>
      <div className="premium-card rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="h-11 rounded-lg bg-[var(--surface-subtle)]" />
          <div className="h-11 rounded-lg bg-[var(--surface-subtle)]" />
        </div>
        <div className="mt-4 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-9 w-24 shrink-0 rounded-full bg-[var(--surface-subtle)]" />
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-[#c6c9e7]/70 bg-white/70">
            <div className="aspect-[4/5] bg-[var(--surface-subtle)] shimmer" />
            <div className="p-4">
              <div className="h-4 rounded bg-[var(--surface-subtle)]" />
              <div className="mt-3 h-3 w-2/3 rounded bg-[var(--surface-subtle)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
