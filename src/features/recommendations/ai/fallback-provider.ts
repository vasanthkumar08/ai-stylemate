import { generateOutfitRecommendations } from "@/features/recommendations/engine";
import type {
  AiClothingAnalysis,
  AiOutfitCombination,
  AiRecommendationRequest,
  AiRecommendationResult,
  OutfitAiProvider
} from "./types";

function inferPattern(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("stripe")) return "striped";
  if (normalized.includes("plaid") || normalized.includes("check")) return "checked";
  if (normalized.includes("floral")) return "floral";
  if (normalized.includes("print")) return "printed";

  return "solid";
}

export class RuleFallbackProvider implements OutfitAiProvider {
  name = "rule-fallback";
  model = "rules-v1";

  async generateRecommendations(request: AiRecommendationRequest): Promise<AiRecommendationResult> {
    const analyses: AiClothingAnalysis[] = request.wardrobeItems.map((item) => ({
      itemId: item.id,
      clothingType: item.type,
      dominantColors: item.colors,
      pattern: inferPattern(item.name),
      confidence: 0.58,
      notes: "Heuristic analysis generated without an AI provider."
    }));

    const outfits: AiOutfitCombination[] = generateOutfitRecommendations({
      occasion: request.occasion,
      weather: request.weather,
      season: request.season,
      wardrobeItems: request.wardrobeItems,
      maxRecommendations: request.maxRecommendations
    }).map((outfit) => ({
      ...outfit,
      stylingExplanation: outfit.stylingNotes.join(" "),
      suggestedAccessories:
        request.occasion === "wedding" || request.occasion === "party"
          ? ["polished watch", "minimal belt", "structured bag"]
          : ["simple belt", "weather-appropriate bag"]
    }));

    return {
      provider: this.name,
      model: this.model,
      usedFallback: true,
      analyses,
      outfits
    };
  }
}
