export type OutfitOccasion =
  | "office"
  | "wedding"
  | "vacation"
  | "beach"
  | "party"
  | "interview"
  | "date";

export type OutfitSeason = "spring" | "summer" | "fall" | "winter" | "all-season";

export type WeatherCondition = "hot" | "warm" | "mild" | "cool" | "cold" | "rain" | "wind";

export type WardrobeItemType =
  | "shirt"
  | "t-shirt"
  | "jeans"
  | "blazer"
  | "shoes"
  | "accessories"
  | "dress"
  | "outerwear"
  | "bottom"
  | "top"
  | "other";

export type RecommendationWardrobeItem = {
  id: string;
  name: string;
  type: WardrobeItemType;
  category?: string;
  colors: string[];
  seasons?: OutfitSeason[];
  fabrics?: string[];
  formality?: number;
  warmth?: number;
  waterproof?: boolean;
};

export type OutfitRecommendationInput = {
  occasion: OutfitOccasion;
  weather: WeatherCondition[];
  season: OutfitSeason;
  wardrobeItems: RecommendationWardrobeItem[];
  maxRecommendations?: number;
};

export type OutfitCombination = {
  id: string;
  score: number;
  occasion: OutfitOccasion;
  items: RecommendationWardrobeItem[];
  stylingNotes: string[];
  colorPalette: string[];
  missingCategories: string[];
};

export type RuleContext = {
  input: Required<Omit<OutfitRecommendationInput, "maxRecommendations">> & {
    maxRecommendations: number;
  };
};

export type ScoredOutfit = Omit<OutfitCombination, "id" | "score" | "stylingNotes"> & {
  score: number;
  stylingNotes: string[];
};
