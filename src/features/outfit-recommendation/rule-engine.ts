import type { GeneratedOutfit, OutfitContext, OutfitRecommendation, OutfitWardrobeItem } from "./types";

type ScoredOutfit = {
  outfit: GeneratedOutfit;
  score: number;
  reasons: string[];
};

const safeBaseColors = ["black", "white", "blue", "navy", "gray", "grey", "denim"];
const neutralColors = ["black", "white", "gray", "grey", "navy", "beige", "cream", "ivory", "brown", "tan"];
const boldColors = ["red", "pink", "green", "purple", "yellow", "orange", "burgundy", "cobalt"];
const formalFabrics = ["wool", "cotton", "silk", "linen", "crepe", "satin"];
const comfortFabrics = ["cotton", "denim", "jersey", "knit", "linen", "fleece"];

function colorIncludes(color: string, values: string[]) {
  const normalized = color.toLowerCase();
  return values.some((value) => normalized.includes(value));
}

function isNeutral(item: OutfitWardrobeItem) {
  return colorIncludes(item.color, neutralColors);
}

function isBold(item: OutfitWardrobeItem) {
  return colorIncludes(item.color, boldColors);
}

function isSafeBase(item: OutfitWardrobeItem) {
  return colorIncludes(item.color, safeBaseColors);
}

function hasFabric(item: OutfitWardrobeItem, fabrics: string[]) {
  return fabrics.some((fabric) => item.fabric.includes(fabric));
}

function isStructured(item: OutfitWardrobeItem) {
  return ["tailored", "slim", "regular"].some((fit) => item.fit.includes(fit));
}

function isLoose(item: OutfitWardrobeItem) {
  return ["relaxed", "oversized", "loose", "regular"].some((fit) => item.fit.includes(fit));
}

function itemOccasionScore(item: OutfitWardrobeItem, context: OutfitContext) {
  let score = 0;

  if (context.occasion === "office") {
    if (isNeutral(item)) score += 16;
    if (isStructured(item)) score += 14;
    if (hasFabric(item, formalFabrics)) score += 8;
  }

  if (context.occasion === "party") {
    if (isBold(item)) score += 14;
    if (!isNeutral(item)) score += 8;
  }

  if (context.occasion === "travel") {
    if (isLoose(item)) score += 14;
    if (hasFabric(item, comfortFabrics)) score += 10;
    if (item.category === "shoes" && /sneaker|trainer|shoe/i.test(item.name)) score += 16;
  }

  if (context.occasion === "date") {
    if (isSafeBase(item)) score += 8;
    if (isStructured(item) || item.fit.includes("regular")) score += 8;
  }

  if (context.occasion === "wedding") {
    if (isNeutral(item)) score += 10;
    if (hasFabric(item, formalFabrics)) score += 12;
    if (item.category === "outerwear" && /blazer|coat/i.test(item.name)) score += 18;
  }

  if (context.occasion === "casual") {
    if (isLoose(item) || hasFabric(item, comfortFabrics)) score += 10;
  }

  return score;
}

function itemWeatherScore(item: OutfitWardrobeItem, context: OutfitContext) {
  if (context.weather === "hot") {
    return hasFabric(item, ["linen", "cotton"]) ? 10 : item.fabric.includes("wool") ? -8 : 0;
  }

  if (context.weather === "cold") {
    return item.category === "outerwear" || hasFabric(item, ["wool", "fleece", "knit"]) ? 12 : 0;
  }

  if (context.weather === "rainy") {
    return /boot|jacket|coat|water/i.test(`${item.name} ${item.fabric}`) ? 12 : 0;
  }

  return 4;
}

function itemStyleScore(item: OutfitWardrobeItem, context: OutfitContext) {
  if (context.stylePreference === "formal") {
    return isStructured(item) || hasFabric(item, formalFabrics) ? 12 : 0;
  }

  if (context.stylePreference === "streetwear") {
    return isLoose(item) || /sneaker|hoodie|denim|jacket/i.test(`${item.name} ${item.fabric}`) ? 12 : 0;
  }

  if (context.stylePreference === "minimal") {
    return isNeutral(item) ? 12 : 0;
  }

  return isBold(item) || !isNeutral(item) ? 10 : 2;
}

function colorPairScore(top: OutfitWardrobeItem, bottom: OutfitWardrobeItem, shoes: OutfitWardrobeItem) {
  let score = 0;
  const topColor = top.color.toLowerCase();
  const bottomColor = bottom.color.toLowerCase();

  if (topColor !== "unknown" && bottomColor !== "unknown" && topColor === bottomColor) {
    score -= 16;
  }

  if (isSafeBase(top) || isSafeBase(bottom) || isSafeBase(shoes)) {
    score += 12;
  }

  if ((isNeutral(top) && !isNeutral(bottom)) || (!isNeutral(top) && isNeutral(bottom))) {
    score += 12;
  }

  if (isBold(top) && isBold(bottom)) {
    score -= 8;
  }

  return score;
}

function fabricCompatibilityScore(outfit: GeneratedOutfit) {
  const items = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear].filter(Boolean) as OutfitWardrobeItem[];
  const hasPremium = items.some((item) => hasFabric(item, formalFabrics));
  const hasComfort = items.some((item) => hasFabric(item, comfortFabrics));

  if (hasPremium && hasComfort) return 7;
  if (hasPremium || hasComfort) return 10;

  return 4;
}

function fitBalanceScore(top: OutfitWardrobeItem, bottom: OutfitWardrobeItem) {
  if (top.fit.includes("oversized") && bottom.fit.includes("slim")) return 14;
  if (top.fit.includes("slim") && bottom.fit.includes("relaxed")) return 12;
  if (top.fit.includes("regular") || bottom.fit.includes("regular")) return 8;

  return 4;
}

function shouldUseOuterwear(layer: OutfitWardrobeItem, context: OutfitContext) {
  return (
    context.weather === "cold" ||
    context.weather === "rainy" ||
    context.occasion === "office" ||
    context.occasion === "wedding" ||
    context.stylePreference === "formal"
  );
}

function buildExplanation(outfit: GeneratedOutfit, context: OutfitContext, reasons: string[]) {
  const parts = [
    `${outfit.top.name}, ${outfit.bottom.name}, and ${outfit.shoes.name} create a ${context.stylePreference} look for ${context.occasion}.`,
    ...reasons.slice(0, 3)
  ];

  if (outfit.outerwear) {
    parts.push(`${outfit.outerwear.name} adds polish and weather coverage.`);
  }

  return parts.join(" ");
}

function scoreOutfit(outfit: GeneratedOutfit, context: OutfitContext): ScoredOutfit {
  const items = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear].filter(Boolean) as OutfitWardrobeItem[];
  const baseScore = items.reduce(
    (total, item) => total + itemOccasionScore(item, context) + itemWeatherScore(item, context) + itemStyleScore(item, context),
    48
  );
  const score =
    baseScore +
    colorPairScore(outfit.top, outfit.bottom, outfit.shoes) +
    fabricCompatibilityScore(outfit) +
    fitBalanceScore(outfit.top, outfit.bottom) +
    (outfit.outerwear ? 8 : 0);
  const reasons = [
    context.occasion === "office" ? "Neutral colors and structured fits keep it work-ready." : "",
    context.occasion === "party" ? "The palette has enough contrast to feel event-ready." : "",
    context.occasion === "travel" ? "Comfort fabrics and practical shoes make it easy to move in." : "",
    context.occasion === "date" ? "The outfit balances polish with an approachable, clean silhouette." : "",
    context.occasion === "wedding" ? "Formal fabrics and layering make the outfit feel elevated." : "",
    context.weather === "hot" ? "Breathable fabric choices help in warmer weather." : "",
    context.weather === "cold" ? "Layering improves warmth without losing shape." : "",
    context.weather === "rainy" ? "Weather-aware pieces keep the outfit practical." : "",
    isSafeBase(outfit.shoes) ? "The shoes act as a safe base color." : ""
  ].filter(Boolean);

  return {
    outfit,
    score: Math.max(1, Math.round(score)),
    reasons
  };
}

function rankCandidates(items: OutfitWardrobeItem[], context: OutfitContext) {
  return [...items].sort((a, b) => {
    const scoreA = itemOccasionScore(a, context) + itemWeatherScore(a, context) + itemStyleScore(a, context);
    const scoreB = itemOccasionScore(b, context) + itemWeatherScore(b, context) + itemStyleScore(b, context);
    return scoreB - scoreA;
  });
}

function uniqueOutfits(outfits: ScoredOutfit[]) {
  const seen = new Set<string>();

  return outfits.filter(({ outfit }) => {
    const key = [outfit.top.id, outfit.bottom.id, outfit.shoes.id, outfit.outerwear?.id ?? ""].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function buildRuleBasedOutfits(
  items: OutfitWardrobeItem[],
  context: OutfitContext,
  variationCount = 4
): OutfitRecommendation {
  const tops = rankCandidates(items.filter((item) => item.category === "top"), context).slice(0, 8);
  const bottoms = rankCandidates(items.filter((item) => item.category === "bottom"), context).slice(0, 8);
  const shoes = rankCandidates(items.filter((item) => item.category === "shoes"), context).slice(0, 8);
  const outerwear = rankCandidates(items.filter((item) => item.category === "outerwear"), context).slice(0, 5);

  if (!tops.length || !bottoms.length || !shoes.length) {
    throw new Error("Upload at least one top, one bottom, and one pair of shoes before generating an outfit.");
  }

  const scored: ScoredOutfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        const base = { top, bottom, shoes: shoe };
        scored.push(scoreOutfit(base, context));

        for (const layer of outerwear) {
          if (shouldUseOuterwear(layer, context)) {
            scored.push(scoreOutfit({ ...base, outerwear: layer }, context));
          }
        }
      }
    }
  }

  const ranked = uniqueOutfits(scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, variationCount));
  const winner = ranked[0];

  if (!winner) {
    throw new Error("Could not build an outfit from the available wardrobe items.");
  }

  return {
    outfit: winner.outfit,
    explanation: buildExplanation(winner.outfit, context, winner.reasons),
    fashionTips: [
      "Keep accessories quiet when the outfit already has strong contrast.",
      "Use black, white, or blue as a safe anchor when adding another layer."
    ],
    confidenceScore: Math.min(100, winner.score),
    alternatives: ranked.slice(1, 4).map((item) => ({
      outfit: item.outfit,
      explanation: buildExplanation(item.outfit, context, item.reasons),
      confidenceScore: Math.min(100, item.score)
    }))
  };
}
