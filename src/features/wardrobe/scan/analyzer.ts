import { env } from "@/config/env";

export type ClothingScanCategory = "Top" | "Bottom" | "Shoes" | "Outerwear";
export type ClothingScanStyle = "Formal" | "Casual" | "Streetwear";

export type ClothingScanResult = {
  category: ClothingScanCategory;
  color: string;
  fabric: string;
  style: ClothingScanStyle;
  confidence: number;
  provider: "openai" | "rule-based";
};

type AnalyzeClothingInput = {
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  originalFileName?: string | null;
};

type OpenAiScanResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const scanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: ["Top", "Bottom", "Shoes", "Outerwear"] },
    color: { type: "string" },
    fabric: { type: "string" },
    style: { type: "string", enum: ["Formal", "Casual", "Streetwear"] },
    confidence: { type: "number", minimum: 0, maximum: 100 }
  },
  required: ["category", "color", "fabric", "style", "confidence"]
} as const;

function getOutputText(response: OpenAiScanResponse) {
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

function clampConfidence(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeCategory(value: unknown): ClothingScanCategory {
  if (value === "Bottom" || value === "Shoes" || value === "Outerwear") {
    return value;
  }

  return "Top";
}

function normalizeStyle(value: unknown): ClothingScanStyle {
  if (value === "Formal" || value === "Streetwear") {
    return value;
  }

  return "Casual";
}

function fromUnknownObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function fallbackAnalyzeClothing(input: AnalyzeClothingInput): ClothingScanResult {
  const fileName = input.originalFileName?.toLowerCase() ?? "";
  const aspectRatio = input.width && input.height ? input.width / input.height : null;
  const colorHints = ["black", "white", "blue", "navy", "red", "green", "pink", "beige", "brown", "gray"];
  const color = colorHints.find((hint) => fileName.includes(hint)) ?? "Unknown";

  if (fileName.includes("shoe") || fileName.includes("sneaker") || fileName.includes("boot")) {
    return {
      category: "Shoes",
      color,
      fabric: "Unknown",
      style: "Casual",
      confidence: 68,
      provider: "rule-based"
    };
  }

  if (fileName.includes("jean") || fileName.includes("pant") || fileName.includes("skirt")) {
    return {
      category: "Bottom",
      color,
      fabric: fileName.includes("jean") ? "Denim" : "Unknown",
      style: "Casual",
      confidence: 66,
      provider: "rule-based"
    };
  }

  if (fileName.includes("coat") || fileName.includes("jacket") || fileName.includes("blazer")) {
    return {
      category: "Outerwear",
      color,
      fabric: fileName.includes("blazer") ? "Wool" : "Unknown",
      style: fileName.includes("blazer") ? "Formal" : "Casual",
      confidence: 66,
      provider: "rule-based"
    };
  }

  return {
    category: aspectRatio && aspectRatio > 1.1 ? "Bottom" : "Top",
    color,
    fabric: "Unknown",
    style: "Casual",
    confidence: 60,
    provider: "rule-based"
  };
}

async function analyzeWithOpenAi(input: AnalyzeClothingInput): Promise<ClothingScanResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL,
      instructions:
        "You analyze fashion item photos for StyleMate AI. Return only structured metadata for the primary clothing item. Use Unknown when fabric or color is unclear.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Detect category, dominant color, fabric estimate, style, and confidence for this clothing item."
            },
            {
              type: "input_image",
              image_url: input.imageUrl,
              detail: "low"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "stylemate_clothing_scan",
          strict: true,
          schema: scanSchema
        }
      }
    })
  });

  const body = (await response.json().catch(() => ({}))) as OpenAiScanResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? `OpenAI scan failed with ${response.status}.`);
  }

  const parsed = fromUnknownObject(JSON.parse(getOutputText(body)));

  return {
    category: normalizeCategory(parsed.category),
    color: typeof parsed.color === "string" && parsed.color.trim() ? parsed.color.trim() : "Unknown",
    fabric: typeof parsed.fabric === "string" && parsed.fabric.trim() ? parsed.fabric.trim() : "Unknown",
    style: normalizeStyle(parsed.style),
    confidence: clampConfidence(parsed.confidence, 72),
    provider: "openai"
  };
}

export async function analyzeClothing(input: AnalyzeClothingInput): Promise<ClothingScanResult> {
  try {
    return await analyzeWithOpenAi(input);
  } catch (error) {
    console.warn("[stylemate-scan] using rule-based fallback", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return fallbackAnalyzeClothing(input);
  }
}
