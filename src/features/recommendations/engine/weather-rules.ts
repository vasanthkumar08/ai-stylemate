import type { RecommendationWardrobeItem, WeatherCondition } from "./types";

const hotWeatherFabrics = ["linen", "cotton", "seersucker", "rayon", "viscose"];
const coldWeatherFabrics = ["wool", "cashmere", "fleece", "flannel", "denim"];

export function getWeatherScore(item: RecommendationWardrobeItem, weather: WeatherCondition[]) {
  if (weather.length === 0) {
    return 0.7;
  }

  const fabrics = item.fabrics?.map((fabric) => fabric.toLowerCase()) ?? [];
  const warmth = item.warmth ?? 0.4;
  let score = 0.65;

  if (weather.some((condition) => condition === "hot" || condition === "warm")) {
    if (fabrics.some((fabric) => hotWeatherFabrics.includes(fabric)) || warmth <= 0.35) {
      score += 0.2;
    } else {
      score -= 0.2;
    }
  }

  if (weather.some((condition) => condition === "cold" || condition === "cool" || condition === "wind")) {
    if (warmth >= 0.55 || fabrics.some((fabric) => coldWeatherFabrics.includes(fabric))) {
      score += 0.2;
    } else if (item.type === "outerwear" || item.type === "blazer") {
      score += 0.12;
    } else {
      score -= 0.1;
    }
  }

  if (weather.includes("rain")) {
    score += item.waterproof ? 0.22 : -0.08;
  }

  return Math.max(0, Math.min(1, score));
}

export function buildWeatherNotes(weather: WeatherCondition[]) {
  const notes: string[] = [];

  if (weather.some((condition) => condition === "cold" || condition === "cool")) {
    notes.push("Layer for temperature changes and keep the warmest piece easy to remove indoors.");
  }

  if (weather.includes("rain")) {
    notes.push("Choose weather-resistant shoes or add an umbrella before heading out.");
  }

  if (weather.some((condition) => condition === "hot" || condition === "warm")) {
    notes.push("Favor breathable fabrics and avoid heavy layering.");
  }

  return notes;
}
