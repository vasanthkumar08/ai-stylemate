import { isOpenAiConfigured } from "@/config/env";
import { RuleFallbackProvider } from "./fallback-provider";
import { OpenAiOutfitProvider } from "./openai-provider";
import type { OutfitAiProvider } from "./types";

export function createOutfitAiProvider(): OutfitAiProvider {
  if (isOpenAiConfigured()) {
    return new OpenAiOutfitProvider();
  }

  return new RuleFallbackProvider();
}

export function createFallbackOutfitProvider(): OutfitAiProvider {
  return new RuleFallbackProvider();
}
