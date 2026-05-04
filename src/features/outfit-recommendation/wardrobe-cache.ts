import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { OutfitWardrobeItem } from "./types";

type WardrobeRow = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  colors: string[] | null;
  material_tags: string[] | null;
  image_url: string;
  ai_attributes: Json;
};

type CacheEntry = {
  expiresAt: number;
  items: OutfitWardrobeItem[];
};

const wardrobeCache = new Map<string, CacheEntry>();
const cacheTtlMs = 30_000;

function getStringAttribute(attributes: Json, key: string) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return "";
  }

  const value = (attributes as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function normalizeCategory(category: string, subcategory: string | null): OutfitWardrobeItem["category"] {
  const value = `${category} ${subcategory ?? ""}`.toLowerCase();

  if (value.includes("shoe") || value.includes("sneaker") || value.includes("boot")) return "shoes";
  if (value.includes("outerwear") || value.includes("blazer") || value.includes("jacket") || value.includes("coat")) {
    return "outerwear";
  }
  if (value.includes("bottom") || value.includes("jean") || value.includes("pant") || value.includes("skirt") || value.includes("short")) {
    return "bottom";
  }
  if (value.includes("top") || value.includes("shirt") || value.includes("tee") || value.includes("sweater")) return "top";

  return "other";
}

function mapWardrobeRow(row: WardrobeRow): OutfitWardrobeItem {
  return {
    id: row.id,
    name: row.name,
    category: normalizeCategory(row.category, row.subcategory),
    color: row.colors?.[0]?.toLowerCase() ?? "unknown",
    fabric: row.material_tags?.[0]?.toLowerCase() ?? "unknown",
    brand: row.brand,
    fit: getStringAttribute(row.ai_attributes, "fit") || "regular",
    image_url: row.image_url
  };
}

export function clearWardrobeCache(userId: string) {
  wardrobeCache.delete(userId);
}

export async function getCachedWardrobeItems(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OutfitWardrobeItem[]> {
  const cached = wardrobeCache.get(userId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  const createQuery = () =>
    supabase
      .from("wardrobe_items")
      .select("id,name,category,subcategory,brand,colors,material_tags,image_url,ai_attributes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);

  let { data, error } = await createQuery().is("deleted_at", null);

  if (error?.code === "42703") {
    ({ data, error } = await createQuery());
  }

  if (error) {
    throw new Error("Could not load wardrobe items.");
  }

  const items = ((data ?? []) as WardrobeRow[]).map(mapWardrobeRow);
  wardrobeCache.set(userId, {
    expiresAt: Date.now() + cacheTtlMs,
    items
  });

  return items;
}
