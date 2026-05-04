import type { OutfitOccasion, RecommendationWardrobeItem } from "./types";

type OccasionRule = {
  requiredTypes: string[];
  preferredTypes: string[];
  avoidedTypes: string[];
  minFormality: number;
  notes: string[];
};

export const occasionRules: Record<OutfitOccasion, OccasionRule> = {
  office: {
    requiredTypes: ["top", "bottom", "shoes"],
    preferredTypes: ["shirt", "blazer"],
    avoidedTypes: ["beach"],
    minFormality: 0.45,
    notes: ["Keep proportions clean and choose one polished layer for office credibility."]
  },
  wedding: {
    requiredTypes: ["shoes"],
    preferredTypes: ["dress", "blazer", "shirt"],
    avoidedTypes: ["t-shirt", "jeans"],
    minFormality: 0.72,
    notes: ["Lean formal, refined, and photo-ready; avoid denim unless the invite says casual."]
  },
  vacation: {
    requiredTypes: ["top", "bottom", "shoes"],
    preferredTypes: ["t-shirt", "accessories"],
    avoidedTypes: [],
    minFormality: 0.25,
    notes: ["Prioritize breathable fabrics and pieces that can repeat across multiple looks."]
  },
  beach: {
    requiredTypes: ["top", "bottom", "shoes"],
    preferredTypes: ["t-shirt", "accessories"],
    avoidedTypes: ["blazer"],
    minFormality: 0.1,
    notes: ["Keep the outfit light, washable, and relaxed enough for sand and sun."]
  },
  party: {
    requiredTypes: ["top", "bottom", "shoes"],
    preferredTypes: ["blazer", "accessories"],
    avoidedTypes: [],
    minFormality: 0.5,
    notes: ["Add one statement piece and keep the rest sharp."]
  },
  interview: {
    requiredTypes: ["top", "bottom", "shoes"],
    preferredTypes: ["shirt", "blazer"],
    avoidedTypes: ["t-shirt", "jeans"],
    minFormality: 0.75,
    notes: ["Choose structured pieces, quiet colors, and polished shoes."]
  },
  date: {
    requiredTypes: ["top", "bottom", "shoes"],
    preferredTypes: ["shirt", "blazer", "accessories"],
    avoidedTypes: [],
    minFormality: 0.45,
    notes: ["Aim for intentional but comfortable; add texture or a refined accessory."]
  }
};

export function getOccasionRule(occasion: OutfitOccasion) {
  return occasionRules[occasion];
}

export function getOccasionScore(item: RecommendationWardrobeItem, occasion: OutfitOccasion) {
  const rule = getOccasionRule(occasion);
  const itemType = item.type;
  const formality = item.formality ?? 0.45;
  let score = 0.5;

  if (rule.requiredTypes.includes(itemType) || rule.preferredTypes.includes(itemType)) {
    score += 0.25;
  }

  if (rule.avoidedTypes.includes(itemType)) {
    score -= 0.45;
  }

  if (formality >= rule.minFormality) {
    score += 0.2;
  } else {
    score -= Math.min(0.3, rule.minFormality - formality);
  }

  return Math.max(0, Math.min(1, score));
}
