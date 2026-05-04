export type OutfitContext = {
  occasion: "wedding" | "office" | "party" | "travel" | "casual" | "date";
  weather: "hot" | "cold" | "rainy" | "mild";
  stylePreference: "formal" | "streetwear" | "minimal" | "trendy";
};

export type OutfitWardrobeItem = {
  id: string;
  name: string;
  category: "top" | "bottom" | "shoes" | "outerwear" | "other";
  color: string;
  fabric: string;
  brand: string | null;
  fit: string;
  image_url: string;
};

export type GeneratedOutfit = {
  top: OutfitWardrobeItem;
  bottom: OutfitWardrobeItem;
  shoes: OutfitWardrobeItem;
  outerwear?: OutfitWardrobeItem;
};

export type OutfitRecommendation = {
  outfit: GeneratedOutfit;
  explanation: string;
  fashionTips: string[];
  confidenceScore: number;
  alternatives: Array<{
    outfit: GeneratedOutfit;
    explanation: string;
    confidenceScore: number;
  }>;
};
