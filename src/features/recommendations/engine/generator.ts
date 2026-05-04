import { buildColorNotes, getColorCompatibilityScore } from "./color-rules";
import { getOccasionRule, getOccasionScore } from "./occasion-rules";
import { buildSeasonNote, getSeasonScore } from "./season-rules";
import { buildWeatherNotes, getWeatherScore } from "./weather-rules";
import type {
  OutfitCombination,
  OutfitRecommendationInput,
  RecommendationWardrobeItem,
  RuleContext,
  ScoredOutfit
} from "./types";

const defaultMaxRecommendations = 5;

function canonicalType(item: RecommendationWardrobeItem) {
  if (item.type === "shirt" || item.type === "t-shirt") {
    return "top";
  }

  if (item.type === "jeans") {
    return "bottom";
  }

  if (item.type === "accessories") {
    return "accessory";
  }

  return item.type;
}

function hasType(items: RecommendationWardrobeItem[], type: string) {
  return items.some((item) => canonicalType(item) === type);
}

function groupItems(items: RecommendationWardrobeItem[]) {
  return {
    tops: items.filter((item) => ["top", "shirt", "t-shirt"].includes(item.type)),
    bottoms: items.filter((item) => ["bottom", "jeans"].includes(item.type)),
    dresses: items.filter((item) => item.type === "dress"),
    shoes: items.filter((item) => item.type === "shoes"),
    layers: items.filter((item) => ["blazer", "outerwear"].includes(item.type)),
    accessories: items.filter((item) => item.type === "accessories")
  };
}

function scoreItem(item: RecommendationWardrobeItem, context: RuleContext) {
  const { occasion, weather, season } = context.input;

  return (
    getOccasionScore(item, occasion) * 0.42 +
    getWeatherScore(item, weather) * 0.28 +
    getSeasonScore(item, season) * 0.3
  );
}

function sortCandidates(items: RecommendationWardrobeItem[], context: RuleContext) {
  return [...items].sort((a, b) => scoreItem(b, context) - scoreItem(a, context));
}

function getTopCandidates(items: RecommendationWardrobeItem[], context: RuleContext, count = 4) {
  return sortCandidates(items, context).slice(0, count);
}

function uniqueByItemIds(outfits: ScoredOutfit[]) {
  const seen = new Set<string>();

  return outfits.filter((outfit) => {
    const key = outfit.items
      .map((item) => item.id)
      .sort()
      .join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildMissingCategories(items: RecommendationWardrobeItem[], context: RuleContext) {
  const rule = getOccasionRule(context.input.occasion);

  return rule.requiredTypes.filter((type) => !hasType(items, type));
}

function buildOutfitScore(items: RecommendationWardrobeItem[], context: RuleContext) {
  const itemScore = items.reduce((total, item) => total + scoreItem(item, context), 0) / items.length;
  const colorScore = getColorCompatibilityScore(items.flatMap((item) => item.colors));
  const missingCategories = buildMissingCategories(items, context);
  const completenessPenalty = missingCategories.length * 0.16;

  return Math.max(0, Math.min(1, itemScore * 0.7 + colorScore * 0.3 - completenessPenalty));
}

function buildStylingNotes(items: RecommendationWardrobeItem[], context: RuleContext) {
  const rule = getOccasionRule(context.input.occasion);
  const notes = [
    ...rule.notes,
    buildSeasonNote(context.input.season),
    ...buildWeatherNotes(context.input.weather),
    ...buildColorNotes(items.flatMap((item) => item.colors))
  ];

  const layer = items.find((item) => item.type === "blazer" || item.type === "outerwear");

  if (layer) {
    notes.push(`${layer.name} adds structure and makes the outfit feel finished.`);
  }

  return Array.from(new Set(notes)).slice(0, 5);
}

function createScoredOutfit(items: RecommendationWardrobeItem[], context: RuleContext): ScoredOutfit {
  return {
    occasion: context.input.occasion,
    items,
    score: buildOutfitScore(items, context),
    stylingNotes: buildStylingNotes(items, context),
    colorPalette: Array.from(new Set(items.flatMap((item) => item.colors.map((color) => color.toLowerCase())))),
    missingCategories: buildMissingCategories(items, context)
  };
}

function buildCombinations(context: RuleContext) {
  const grouped = groupItems(context.input.wardrobeItems);
  const tops = getTopCandidates(grouped.tops, context);
  const bottoms = getTopCandidates(grouped.bottoms, context);
  const dresses = getTopCandidates(grouped.dresses, context);
  const shoes = getTopCandidates(grouped.shoes, context);
  const layers = getTopCandidates(grouped.layers, context, 3);
  const accessories = getTopCandidates(grouped.accessories, context, 3);
  const outfits: ScoredOutfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        const base = [top, bottom, shoe];
        outfits.push(createScoredOutfit(base, context));

        for (const layer of layers) {
          outfits.push(createScoredOutfit([...base, layer], context));
        }

        for (const accessory of accessories) {
          outfits.push(createScoredOutfit([...base, accessory], context));
        }
      }
    }
  }

  for (const dress of dresses) {
    for (const shoe of shoes) {
      const base = [dress, shoe];
      outfits.push(createScoredOutfit(base, context));

      for (const layer of layers) {
        outfits.push(createScoredOutfit([...base, layer], context));
      }

      for (const accessory of accessories) {
        outfits.push(createScoredOutfit([...base, accessory], context));
      }
    }
  }

  if (outfits.length === 0) {
    const fallback = getTopCandidates(context.input.wardrobeItems, context, 4);

    if (fallback.length) {
      outfits.push(createScoredOutfit(fallback, context));
    }
  }

  return uniqueByItemIds(outfits)
    .sort((a, b) => b.score - a.score)
    .slice(0, context.input.maxRecommendations)
    .map((outfit, index): OutfitCombination => ({
      ...outfit,
      id: `rule-v1-${index + 1}`,
      score: Number(outfit.score.toFixed(3))
    }));
}

export function generateOutfitRecommendations(input: OutfitRecommendationInput): OutfitCombination[] {
  const context: RuleContext = {
    input: {
      occasion: input.occasion,
      weather: input.weather,
      season: input.season,
      wardrobeItems: input.wardrobeItems,
      maxRecommendations: input.maxRecommendations ?? defaultMaxRecommendations
    }
  };

  return buildCombinations(context);
}
