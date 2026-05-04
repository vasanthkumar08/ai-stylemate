import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { enhanceWithAI } from "./ai-enhancement";
import { buildRuleBasedOutfits } from "./rule-engine";
import type { OutfitContext, OutfitRecommendation } from "./types";
import { getCachedWardrobeItems } from "./wardrobe-cache";

export async function generateOutfit(
  supabase: SupabaseClient<Database>,
  userId: string,
  context: OutfitContext,
  options: { variations?: number; enhance?: boolean } = {}
): Promise<OutfitRecommendation> {
  const wardrobeItems = await getCachedWardrobeItems(supabase, userId);
  const recommendation = buildRuleBasedOutfits(wardrobeItems, context, options.variations ?? 4);

  if (options.enhance === false) {
    return recommendation;
  }

  return enhanceWithAI(recommendation, context);
}

export type { OutfitContext, OutfitRecommendation };
