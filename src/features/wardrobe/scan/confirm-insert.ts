import type { Database, Json } from "@/types/database";

type WardrobeInsert = Database["public"]["Tables"]["wardrobe_items"]["Insert"];

export type ScanConfirmMetadata = {
  category: "Top" | "Bottom" | "Shoes" | "Outerwear";
  color: string;
  fabric: string;
  style: "Formal" | "Casual" | "Streetwear";
  confidence: number;
  provider: "openai" | "rule-based";
};

export type BuildWardrobePayloadInput = {
  userId: string;
  name: string;
  itemType: string;
  category: string;
  imageUrl: string;
  cloudinaryPublicId: string;
  fileSha256: string;
  color: string;
  fabric: string;
  metadata: ScanConfirmMetadata;
};

function cleanTag(value: string) {
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : null;
}

export function buildWardrobePayload(input: BuildWardrobePayloadInput): WardrobeInsert {
  const color = cleanTag(input.color);
  const fabric = cleanTag(input.fabric);
  const aiAttributes: Json = {
    source: "ai_wardrobe_scan",
    scan_category: input.metadata.category,
    style: input.metadata.style,
    fabric_estimate: input.metadata.fabric,
    confidence: input.metadata.confidence,
    provider: input.metadata.provider,
    file_sha256: input.fileSha256,
    item_type: input.itemType
  };

  return {
    user_id: input.userId,
    name: input.name,
    category: input.category,
    color: color ?? null,
    subcategory: input.itemType,
    colors: color ? [color] : [],
    season_tags: [],
    material_tags: fabric ? [fabric] : [],
    image_url: input.imageUrl,
    cloudinary_public_id: input.cloudinaryPublicId,
    ai_attributes: aiAttributes
  };
}
