import { z } from "zod";

export const wardrobeCategorySchema = z.enum([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessory",
  "bag",
  "jewelry",
  "activewear",
  "other"
]);

export const wardrobeItemTypeSchema = z.enum([
  "shirt",
  "tshirt",
  "jeans",
  "blazer",
  "shoes",
  "accessories",
  "dress",
  "skirt",
  "shorts",
  "sweater",
  "jacket",
  "coat",
  "bag",
  "jewelry",
  "activewear",
  "other"
]);

export type WardrobeItemType = z.infer<typeof wardrobeItemTypeSchema>;
export type WardrobeCategory = z.infer<typeof wardrobeCategorySchema>;

const itemTypeToCategory: Record<WardrobeItemType, WardrobeCategory> = {
  shirt: "top",
  tshirt: "top",
  jeans: "bottom",
  blazer: "outerwear",
  shoes: "shoes",
  accessories: "accessory",
  dress: "dress",
  skirt: "bottom",
  shorts: "bottom",
  sweater: "top",
  jacket: "outerwear",
  coat: "outerwear",
  bag: "bag",
  jewelry: "jewelry",
  activewear: "activewear",
  other: "other"
};

export function mapWardrobeItemTypeToCategory(itemType: WardrobeItemType) {
  return itemTypeToCategory[itemType];
}

export const wardrobeUploadSchema = z.object({
  name: z.string().trim().max(80).optional(),
  category: wardrobeCategorySchema,
  color: z.string().trim().max(40).optional(),
  season: z.enum(["spring", "summer", "fall", "winter", "all-season"]).optional(),
  fabric: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(80).optional(),
  fit: z.enum(["slim", "regular", "relaxed", "oversized", "tailored", "stretch"]).optional()
});

export type WardrobeUploadInput = z.infer<typeof wardrobeUploadSchema>;

export const wardrobeUploadApiSchema = wardrobeUploadSchema.extend({
  name: z.string().trim().min(1).max(80)
});

export const wardrobeUploadItemSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().max(80).optional(),
  itemType: wardrobeItemTypeSchema,
  color: z.string().trim().max(40).optional(),
  season: z.enum(["summer", "winter", "all-season"]),
  fabric: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(80).optional(),
  fit: z.enum(["slim", "regular", "oversized"])
});

export const wardrobeUploadFormSchema = z.object({
  items: z.array(wardrobeUploadItemSchema).max(20, "Upload up to 20 images at a time.")
});

export type WardrobeUploadFormInput = z.infer<typeof wardrobeUploadFormSchema>;

export const wardrobeUploadV2ApiSchema = z.object({
  name: z.string().trim().min(1).max(80),
  itemType: wardrobeItemTypeSchema,
  color: z.string().trim().max(40).optional(),
  season: z.enum(["summer", "winter", "all-season"]),
  fabric: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(80).optional(),
  fit: z.enum(["slim", "regular", "oversized"])
});

export const allowedWardrobeMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const maxWardrobeUploadBytes = 5 * 1024 * 1024;
