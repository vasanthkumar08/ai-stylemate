import { z } from "zod";

export const outfitRecommendationRequestSchema = z.object({
  occasion: z.enum(["office", "wedding", "vacation", "beach", "party", "interview", "date"]),
  destination: z.string().max(120).optional(),
  weatherSummary: z.string().max(240).optional(),
  weather: z
    .array(z.enum(["hot", "warm", "mild", "cool", "cold", "rain", "wind"]))
    .max(4)
    .default(["mild"]),
  season: z.enum(["spring", "summer", "fall", "winter", "all-season"]),
  stylePreferences: z.array(z.string().min(2).max(40)).max(12).default([])
});

export type OutfitRecommendationRequest = z.infer<typeof outfitRecommendationRequestSchema>;
