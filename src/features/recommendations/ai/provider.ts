import { env } from "@/config/env";
import { RuleFallbackProvider } from "./fallback-provider";
import { OpenAiOutfitProvider } from "./openai-provider";
import type { OutfitAiProvider } from "./types";

export function createOutfitAiProvider(): OutfitAiProvider {
  if (env.OPENAI_API_KEY) {
    return new OpenAiOutfitProvider();
  }

  return new RuleFallbackProvider();
}

export function createFallbackOutfitProvider(): OutfitAiProvider {
  return new RuleFallbackProvider();
}
