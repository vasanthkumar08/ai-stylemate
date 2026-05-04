import type { Database } from "@/types/database";
import type { OutfitSeason } from "../engine";
import type { AiWardrobeItem } from "./types";

type WardrobeRow = Database["public"]["Tables"]["wardrobe_items"]["Row"];

function normalize(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function inferType(item: WardrobeRow): AiWardrobeItem["type"] {
  const text = normalize([item.name, item.category, item.subcategory].filter(Boolean).join(" "));

  if (text.includes("t-shirt") || text.includes("tee")) return "t-shirt";
  if (text.includes("shirt") || text.includes("oxford") || text.includes("blouse")) return "shirt";
  if (text.includes("jean") || text.includes("denim")) return "jeans";
  if (text.includes("blazer")) return "blazer";
  if (text.includes("shoe") || text.includes("sneaker") || text.includes("loafer") || text.includes("heel")) {
    return "shoes";
  }
  if (text.includes("bag") || text.includes("watch") || text.includes("jewelry") || text.includes("accessory")) {
    return "accessories";
  }
  if (text.includes("dress")) return "dress";
  if (text.includes("coat") || text.includes("jacket") || text.includes("outerwear")) return "outerwear";
  if (item.category === "bottom") return "bottom";
  if (item.category === "top") return "top";

  return "other";
}

function getNumberAttribute(attributes: unknown, key: string, fallback: number) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return fallback;
  }

  const value = (attributes as Record<string, unknown>)[key];
  return typeof value === "number" ? value : fallback;
}

export function mapWardrobeRowToAiItem(item: WardrobeRow): AiWardrobeItem {
  const seasons = (item.season_tags?.length ? item.season_tags : ["all-season"]) as OutfitSeason[];

  return {
    id: item.id,
    name: item.name,
    type: inferType(item),
    category: item.category,
    imageUrl: item.image_url,
    brand: item.brand,
    colors: item.colors ?? [],
    seasons,
    fabrics: item.material_tags ?? [],
    formality: getNumberAttribute(item.ai_attributes, "formality", 0.45),
    warmth: getNumberAttribute(item.ai_attributes, "warmth", 0.4),
    waterproof: Boolean(
      item.ai_attributes &&
        typeof item.ai_attributes === "object" &&
        !Array.isArray(item.ai_attributes) &&
        (item.ai_attributes as Record<string, unknown>).waterproof
    )
  };
}
