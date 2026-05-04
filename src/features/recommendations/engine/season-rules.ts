import type { OutfitSeason, RecommendationWardrobeItem } from "./types";

export function getSeasonScore(item: RecommendationWardrobeItem, season: OutfitSeason) {
  if (season === "all-season") {
    return 0.75;
  }

  const seasons = item.seasons ?? ["all-season"];

  if (seasons.includes("all-season") || seasons.includes(season)) {
    return 1;
  }

  const nearSeasonPairs: Record<OutfitSeason, OutfitSeason[]> = {
    spring: ["summer", "fall"],
    summer: ["spring"],
    fall: ["spring", "winter"],
    winter: ["fall"],
    "all-season": []
  };

  return nearSeasonPairs[season].some((nearSeason) => seasons.includes(nearSeason)) ? 0.62 : 0.35;
}

export function buildSeasonNote(season: OutfitSeason) {
  if (season === "all-season") {
    return "The outfit uses versatile pieces that can work across seasons.";
  }

  return `The outfit is balanced for ${season} conditions.`;
}
