import { env } from "@/config/env";
import { generateOutfitRecommendations } from "@/features/recommendations/engine";
import type {
  AiRecommendationRequest,
  AiRecommendationResult,
  OutfitAiProvider
} from "./types";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

type OpenAiStructuredResult = Omit<AiRecommendationResult, "provider" | "model" | "usedFallback" | "usage">;

const structuredSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    analyses: {
      type: "array",
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          itemId: { type: "string" },
          clothingType: { type: "string" },
          dominantColors: { type: "array", items: { type: "string" }, maxItems: 5 },
          pattern: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          notes: { type: "string" }
        },
        required: ["itemId", "clothingType", "dominantColors", "pattern", "confidence", "notes"]
      }
    },
    outfits: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 1 },
          occasion: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                type: { type: "string" },
                category: { type: "string" },
                colors: { type: "array", items: { type: "string" } },
                seasons: { type: "array", items: { type: "string" } },
                fabrics: { type: "array", items: { type: "string" } },
                formality: { type: "number" },
                warmth: { type: "number" },
                waterproof: { type: "boolean" },
                imageUrl: { type: "string" },
                brand: { anyOf: [{ type: "string" }, { type: "null" }] }
              },
              required: [
                "id",
                "name",
                "type",
                "category",
                "colors",
                "seasons",
                "fabrics",
                "formality",
                "warmth",
                "waterproof",
                "imageUrl",
                "brand"
              ]
            },
            maxItems: 6
          },
          stylingNotes: { type: "array", items: { type: "string" }, maxItems: 6 },
          colorPalette: { type: "array", items: { type: "string" }, maxItems: 8 },
          missingCategories: { type: "array", items: { type: "string" } },
          stylingExplanation: { type: "string" },
          suggestedAccessories: { type: "array", items: { type: "string" }, maxItems: 6 }
        },
        required: [
          "id",
          "score",
          "occasion",
          "items",
          "stylingNotes",
          "colorPalette",
          "missingCategories",
          "stylingExplanation",
          "suggestedAccessories"
        ]
      }
    }
  },
  required: ["analyses", "outfits"]
} as const;

function getOutputText(response: OpenAiResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return { controller, timeout };
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAiOutfitProvider implements OutfitAiProvider {
  name = "openai";
  model = env.OPENAI_VISION_MODEL;

  async generateRecommendations(request: AiRecommendationRequest): Promise<AiRecommendationResult> {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured.");
    }

    const ruleSeeds = generateOutfitRecommendations({
      occasion: request.occasion,
      weather: request.weather,
      season: request.season,
      wardrobeItems: request.wardrobeItems,
      maxRecommendations: request.maxRecommendations
    });
    const payload = {
      occasion: request.occasion,
      weather: request.weather,
      weatherSummary: request.weatherSummary,
      season: request.season,
      destination: request.destination,
      stylePreferences: request.stylePreferences,
      ruleBasedSeeds: ruleSeeds,
      wardrobeItems: request.wardrobeItems.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.category,
        brand: item.brand,
        knownColors: item.colors,
        knownFabrics: item.fabrics,
        seasons: item.seasons,
        imageUrl: item.imageUrl
      }))
    };

    const body = {
      model: this.model,
      instructions:
        "You are StyleMate AI's wardrobe stylist. Analyze item images and metadata. Detect clothing type, colors, pattern, and produce practical outfit combinations. Only use supplied wardrobe item IDs. Return concise, specific styling explanations and accessory suggestions.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(payload)
            },
            ...request.wardrobeItems.slice(0, 16).map((item) => ({
              type: "input_image",
              image_url: item.imageUrl,
              detail: "low"
            }))
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "stylemate_outfit_recommendation",
          strict: true,
          schema: structuredSchema
        }
      }
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { controller, timeout } = withTimeout(env.AI_RECOMMENDATION_TIMEOUT_MS);

      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        const responseBody = (await response.json().catch(() => ({}))) as OpenAiResponse & {
          error?: { message?: string };
        };

        if (!response.ok) {
          if (attempt < 3 && isRetryableStatus(response.status)) {
            await sleep(300 * attempt);
            continue;
          }

          throw new Error(responseBody.error?.message ?? `OpenAI request failed with ${response.status}.`);
        }

        const outputText = getOutputText(responseBody);
        const parsed = JSON.parse(outputText) as OpenAiStructuredResult;

        const usage =
          responseBody.usage?.input_tokens ||
          responseBody.usage?.output_tokens ||
          responseBody.usage?.total_tokens
            ? {
                ...(responseBody.usage?.input_tokens
                  ? { inputTokens: responseBody.usage.input_tokens }
                  : {}),
                ...(responseBody.usage?.output_tokens
                  ? { outputTokens: responseBody.usage.output_tokens }
                  : {}),
                ...(responseBody.usage?.total_tokens
                  ? { totalTokens: responseBody.usage.total_tokens }
                  : {})
              }
            : undefined;

        return {
          provider: this.name,
          model: this.model,
          usedFallback: false,
          ...parsed,
          ...(usage ? { usage } : {})
        };
      } catch (error) {
        lastError = error;

        if (attempt < 3) {
          await sleep(300 * attempt);
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("OpenAI recommendation failed.");
  }
}
