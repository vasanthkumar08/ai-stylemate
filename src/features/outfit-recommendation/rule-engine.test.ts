import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRuleBasedOutfits } from "./rule-engine";
import type { OutfitWardrobeItem } from "./types";

const wardrobe: OutfitWardrobeItem[] = [
  {
    id: "top-white-shirt",
    name: "White Oxford Shirt",
    category: "top",
    color: "white",
    fabric: "cotton",
    brand: "StyleMate",
    fit: "tailored",
    image_url: "https://example.com/top.jpg"
  },
  {
    id: "top-red-tee",
    name: "Red Party Tee",
    category: "top",
    color: "red",
    fabric: "cotton",
    brand: null,
    fit: "regular",
    image_url: "https://example.com/red.jpg"
  },
  {
    id: "bottom-black",
    name: "Black Slim Trousers",
    category: "bottom",
    color: "black",
    fabric: "wool",
    brand: null,
    fit: "slim",
    image_url: "https://example.com/bottom.jpg"
  },
  {
    id: "bottom-denim",
    name: "Relaxed Denim",
    category: "bottom",
    color: "blue",
    fabric: "denim",
    brand: null,
    fit: "relaxed",
    image_url: "https://example.com/denim.jpg"
  },
  {
    id: "shoes-black",
    name: "Black Leather Shoes",
    category: "shoes",
    color: "black",
    fabric: "leather",
    brand: null,
    fit: "regular",
    image_url: "https://example.com/shoes.jpg"
  },
  {
    id: "shoes-sneakers",
    name: "White Sneakers",
    category: "shoes",
    color: "white",
    fabric: "canvas",
    brand: null,
    fit: "regular",
    image_url: "https://example.com/sneakers.jpg"
  },
  {
    id: "outer-blazer",
    name: "Navy Wool Blazer",
    category: "outerwear",
    color: "navy",
    fabric: "wool",
    brand: null,
    fit: "tailored",
    image_url: "https://example.com/blazer.jpg"
  }
];

describe("AI outfit recommendation rule engine", () => {
  it("builds a complete office outfit with formal neutral pieces", () => {
    const recommendation = buildRuleBasedOutfits(wardrobe, {
      occasion: "office",
      weather: "mild",
      stylePreference: "formal"
    });

    assert.equal(recommendation.outfit.top.id, "top-white-shirt");
    assert.equal(recommendation.outfit.bottom.id, "bottom-black");
    assert.equal(recommendation.outfit.shoes.id, "shoes-black");
    assert.equal(recommendation.outfit.outerwear?.id, "outer-blazer");
    assert.ok(recommendation.confidenceScore > 80);
    assert.ok(recommendation.alternatives.length > 0);
  });

  it("requires top, bottom, and shoes", () => {
    assert.throws(
      () =>
        buildRuleBasedOutfits(wardrobe.filter((item) => item.category !== "shoes"), {
          occasion: "casual",
          weather: "hot",
          stylePreference: "minimal"
        }),
      /one top, one bottom, and one pair of shoes/
    );
  });
});
