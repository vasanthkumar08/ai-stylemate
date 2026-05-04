import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateOutfitRecommendations,
  getColorCompatibilityScore,
  getOccasionScore,
  getSeasonScore,
  getWeatherScore,
  type RecommendationWardrobeItem
} from "./index.js";

const wardrobe: RecommendationWardrobeItem[] = [
  {
    id: "white-shirt",
    name: "White Oxford Shirt",
    type: "shirt",
    colors: ["white"],
    seasons: ["spring", "fall", "all-season"],
    fabrics: ["cotton"],
    formality: 0.76,
    warmth: 0.35
  },
  {
    id: "black-tee",
    name: "Black T-shirt",
    type: "t-shirt",
    colors: ["black"],
    seasons: ["summer", "all-season"],
    fabrics: ["cotton"],
    formality: 0.25,
    warmth: 0.2
  },
  {
    id: "dark-jeans",
    name: "Dark Straight Jeans",
    type: "jeans",
    colors: ["denim"],
    seasons: ["spring", "fall", "winter"],
    fabrics: ["denim"],
    formality: 0.42,
    warmth: 0.55
  },
  {
    id: "navy-blazer",
    name: "Navy Blazer",
    type: "blazer",
    colors: ["navy"],
    seasons: ["spring", "fall", "winter"],
    fabrics: ["wool"],
    formality: 0.86,
    warmth: 0.68
  },
  {
    id: "leather-shoes",
    name: "Black Leather Shoes",
    type: "shoes",
    colors: ["black"],
    seasons: ["all-season"],
    fabrics: ["leather"],
    formality: 0.8,
    warmth: 0.4,
    waterproof: true
  },
  {
    id: "canvas-tote",
    name: "Canvas Tote",
    type: "accessories",
    colors: ["ivory"],
    seasons: ["spring", "summer"],
    fabrics: ["canvas"],
    formality: 0.35,
    warmth: 0.1
  }
];

describe("rule-based outfit recommendation engine", () => {
  it("generates complete outfit combinations with styling notes", () => {
    const recommendations = generateOutfitRecommendations({
      occasion: "interview",
      weather: ["cool", "rain"],
      season: "fall",
      wardrobeItems: wardrobe,
      maxRecommendations: 3
    });

    assert.equal(recommendations.length, 3);
    assert.ok(recommendations[0]);
    assert.equal(recommendations[0].occasion, "interview");
    assert.ok(recommendations[0].items.some((item) => item.id === "white-shirt"));
    assert.ok(recommendations[0].items.some((item) => item.id === "leather-shoes"));
    assert.ok(recommendations[0].stylingNotes.length > 0);
    assert.deepEqual(recommendations[0].missingCategories, []);
  });

  it("prioritizes formal items for interview recommendations", () => {
    const shirtScore = getOccasionScore(wardrobe[0]!, "interview");
    const teeScore = getOccasionScore(wardrobe[1]!, "interview");

    assert.ok(shirtScore > teeScore);
  });

  it("scores compatible neutral palettes higher than loud mixed palettes", () => {
    const neutralScore = getColorCompatibilityScore(["navy", "white", "black"]);
    const loudScore = getColorCompatibilityScore(["red", "purple", "orange", "green"]);

    assert.ok(neutralScore > loudScore);
  });

  it("accounts for weather suitability", () => {
    const blazerScore = getWeatherScore(wardrobe[3]!, ["cold", "wind"]);
    const teeScore = getWeatherScore(wardrobe[1]!, ["cold", "wind"]);

    assert.ok(blazerScore > teeScore);
  });

  it("accounts for season suitability", () => {
    const fallScore = getSeasonScore(wardrobe[3]!, "fall");
    const summerScore = getSeasonScore(wardrobe[3]!, "summer");

    assert.ok(fallScore > summerScore);
  });

  it("returns a useful fallback when a full outfit cannot be assembled", () => {
    const recommendations = generateOutfitRecommendations({
      occasion: "beach",
      weather: ["hot"],
      season: "summer",
      wardrobeItems: [wardrobe[1]!, wardrobe[5]!],
      maxRecommendations: 2
    });

    assert.equal(recommendations.length, 1);
    assert.ok(recommendations[0]?.missingCategories.includes("bottom"));
    assert.ok(recommendations[0]?.missingCategories.includes("shoes"));
  });
});
