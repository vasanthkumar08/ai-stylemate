export { generateOutfitRecommendations } from "./generator";
export { getColorCompatibilityScore } from "./color-rules";
export { getOccasionScore } from "./occasion-rules";
export { getWeatherScore } from "./weather-rules";
export { getSeasonScore } from "./season-rules";
export type {
  OutfitCombination,
  OutfitOccasion,
  OutfitRecommendationInput,
  OutfitSeason,
  RecommendationWardrobeItem,
  WeatherCondition
} from "./types";
