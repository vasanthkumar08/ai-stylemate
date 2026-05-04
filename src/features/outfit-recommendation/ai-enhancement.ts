import { env, isOpenAiConfigured } from "@/config/env";
import type { OutfitContext, OutfitRecommendation } from "./types";

type OpenAiEnhancementResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const enhancementSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    explanation: { type: "string" },
    fashionTips: {
      type: "array",
      maxItems: 4,
      items: { type: "string" }
    }
  },
  required: ["explanation", "fashionTips"]
} as const;

function getOutputText(response: OpenAiEnhancementResponse) {
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

function isEnhancement(value: unknown): value is { explanation: string; fashionTips: string[] } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).explanation === "string" &&
    Array.isArray((value as Record<string, unknown>).fashionTips)
  );
}

export async function enhanceWithAI(
  recommendation: OutfitRecommendation,
  context: OutfitContext
): Promise<OutfitRecommendation> {
  if (!isOpenAiConfigured()) {
    return recommendation;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_VISION_MODEL,
        instructions:
          "You are StyleMate AI. Improve the styling explanation and concise fashion tips for a generated outfit. Do not change item choices.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  context,
                  outfit: recommendation.outfit,
                  explanation: recommendation.explanation
                })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "stylemate_outfit_enhancement",
            strict: true,
            schema: enhancementSchema
          }
        }
      })
    });
    const body = (await response.json().catch(() => ({}))) as OpenAiEnhancementResponse;

    if (!response.ok) {
      throw new Error(body.error?.message ?? `OpenAI enhancement failed with ${response.status}.`);
    }

    const parsed = JSON.parse(getOutputText(body)) as unknown;

    if (!isEnhancement(parsed)) {
      return recommendation;
    }

    return {
      ...recommendation,
      explanation: parsed.explanation,
      fashionTips: parsed.fashionTips.filter((tip): tip is string => typeof tip === "string").slice(0, 4)
    };
  } catch (error) {
    console.warn("[stylemate-outfit-ai-enhancement] using rule explanation", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return recommendation;
  }
}
