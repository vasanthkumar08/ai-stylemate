import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canUseOutfitGenerator } from "@/features/feature-flags/service";
import { generateOutfit } from "@/features/outfit-recommendation/service";
import { enforcePlanLimit, incrementPlanUsage } from "@/features/monetization/service";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getAppUserRole } from "@/roles/service";

export const runtime = "nodejs";

const outfitContextSchema = z.object({
  occasion: z.enum(["wedding", "office", "party", "travel", "casual", "date"]),
  weather: z.enum(["hot", "cold", "rainy", "mild"]),
  stylePreference: z.enum(["formal", "streetwear", "minimal", "trendy"])
});

const recommendRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  context: outfitContextSchema,
  smartUpgrade: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, {
    bucket: "outfit-recommend",
    windowMs: 60_000,
    max: 20
  });

  if (!limited.allowed) {
    return jsonError("Too many outfit requests. Please wait a minute.", 429);
  }

  if (!assertTrustedPost(request)) {
    return jsonError("Outfit recommendation request was blocked.", 403);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("You must be signed in to generate an outfit.", 401);
  }

  const appUser = await getAppUserRole(supabase, user);
  const outfitAccess = await canUseOutfitGenerator(appUser, supabase);

  if (!outfitAccess.allowed) {
    return jsonError("Outfit generation is currently disabled.", 403);
  }

  const parsed = recommendRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.issues.at(0)?.message ?? "Outfit request is invalid.", 400);
  }

  if (parsed.data.userId && parsed.data.userId !== user.id) {
    return jsonError("You can only generate outfits from your own wardrobe.", 403);
  }

  const limit = await enforcePlanLimit(supabase, user.id, "outfit");

  if (!limit.allowed) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "Limit reached",
          upgradeRequired: true,
          usage: limit.usage
        },
        { status: 402 }
      )
    );
  }

  try {
    const recommendation = await generateOutfit(supabase, user.id, parsed.data.context, {
      variations: parsed.data.smartUpgrade ? 4 : 1,
      enhance: limit.usage.advancedRecommendations
    });
    const usage = await incrementPlanUsage(supabase, user.id, "outfit");

    return applySecurityHeaders(
      NextResponse.json({
        outfit: recommendation.outfit,
        explanation: recommendation.explanation,
        confidenceScore: recommendation.confidenceScore,
        alternatives: parsed.data.smartUpgrade ? recommendation.alternatives.slice(0, 3) : [],
        fashionTips: recommendation.fashionTips,
        usage
      })
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate outfit.", 400);
  }
}
