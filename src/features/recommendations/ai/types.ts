import type {
  OutfitCombination,
  OutfitOccasion,
  OutfitSeason,
  RecommendationWardrobeItem,
  WeatherCondition
} from "@/features/recommendations/engine";

export type AiWardrobeItem = RecommendationWardrobeItem & {
  imageUrl: string;
  brand?: string | null;
};

export type AiClothingAnalysis = {
  itemId: string;
  clothingType: string;
  dominantColors: string[];
  pattern: string;
  confidence: number;
  notes: string;
};

export type AiOutfitCombination = OutfitCombination & {
  stylingExplanation: string;
  suggestedAccessories: string[];
};

export type AiRecommendationRequest = {
  userId: string;
  occasion: OutfitOccasion;
  weather: WeatherCondition[];
  weatherSummary?: string;
  season: OutfitSeason;
  destination?: string;
  stylePreferences: string[];
  wardrobeItems: AiWardrobeItem[];
  maxRecommendations: number;
};

export type AiRecommendationResult = {
  provider: string;
  model: string;
  usedFallback: boolean;
  analyses: AiClothingAnalysis[];
  outfits: AiOutfitCombination[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type OutfitAiProvider = {
  name: string;
  model: string;
  generateRecommendations(request: AiRecommendationRequest): Promise<AiRecommendationResult>;
};
