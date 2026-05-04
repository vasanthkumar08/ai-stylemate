import { NextResponse, type NextRequest } from "next/server";
import { canUseOutfitGenerator } from "@/features/feature-flags/service";
import { createFallbackOutfitProvider, createOutfitAiProvider } from "@/features/recommendations/ai/provider";
import { logRecommendationActivity } from "@/features/recommendations/ai/logger";
import { mapWardrobeRowToAiItem } from "@/features/recommendations/ai/mapper";
import {
  getRecommendationUsage,
  incrementRecommendationUsage
} from "@/features/recommendations/ai/usage-limits";
import { outfitRecommendationRequestSchema } from "@/features/recommendations/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { logSecurityEvent } from "@/lib/security/anomaly";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeOptionalText, sanitizeTextArray } from "@/lib/security/sanitize";
import { getAppUserRole } from "@/roles/service";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

function hashRequest(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url").slice(0, 96);
}

export async function POST(request: NextRequest) {
  const adminClient = createSupabaseAdminClient();
  const limited = checkRateLimit(request, {
    bucket: "recommendation-generate",
    windowMs: 60_000,
    max: 12
  });

  if (!limited.allowed) {
    await logSecurityEvent(adminClient, request, {
      action: "recommendation.generate",
      severity: "medium",
      reason: "rate_limit_exceeded"
    });
    return jsonError("Too many recommendation requests. Please wait a minute.", 429);
  }

  if (!assertTrustedPost(request)) {
    await logSecurityEvent(adminClient, request, {
      action: "recommendation.generate",
      severity: "high",
      reason: "untrusted_post"
    });
    return jsonError("Recommendation request was blocked.", 403);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("You must be signed in to generate recommendations.", 401);
  }

  const appUser = await getAppUserRole(supabase, user);
  const outfitAccess = await canUseOutfitGenerator(appUser, supabase);

  if (!outfitAccess.allowed) {
    return jsonError("Outfit generation is currently disabled.", 403);
  }

  const userLimited = checkRateLimit(request, {
    bucket: `recommendation-generate-user:${user.id}`,
    windowMs: 60_000,
    max: 8
  });

  if (!userLimited.allowed) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "recommendation.generate",
      severity: "medium",
      reason: "user_rate_limit_exceeded"
    });
    return jsonError("Too many recommendation requests. Please wait a minute.", 429);
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = outfitRecommendationRequestSchema.safeParse(json);

  if (!parsed.success) {
    return jsonError(parsed.error.issues.at(0)?.message ?? "Recommendation request is invalid.", 400);
  }

  const cleanWeatherSummary = sanitizeOptionalText(parsed.data.weatherSummary, 240);
  const cleanDestination = sanitizeOptionalText(parsed.data.destination, 120);
  const cleanStylePreferences = sanitizeTextArray(parsed.data.stylePreferences);

  const usage = await getRecommendationUsage(adminClient, supabase, user.id);

  if (!usage.allowed) {
    return applySecurityHeaders(NextResponse.json(
      {
        error: "Monthly recommendation limit reached.",
        usage: {
          used: usage.used,
          limit: usage.limit,
          periodStart: usage.periodStart,
          periodEnd: usage.periodEnd
        }
      },
      { status: 429 }
    ));
  }

  const { data: wardrobeRows, error: wardrobeError } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (wardrobeError) {
    console.error("[stylemate-recommendation]", {
      userId: user.id,
      code: wardrobeError.code,
      message: wardrobeError.message
    });
    return jsonError("Could not load wardrobe items.", 500);
  }

  const wardrobeItems = (wardrobeRows ?? []).map(mapWardrobeRowToAiItem);

  if (wardrobeItems.length < 2) {
    return jsonError("Upload at least two wardrobe items before generating an outfit.", 400);
  }

  const requestPayload = {
    userId: user.id,
    occasion: parsed.data.occasion,
    weather: parsed.data.weather,
    season: parsed.data.season,
    stylePreferences: cleanStylePreferences,
    wardrobeItems,
    maxRecommendations: 5,
    ...(cleanWeatherSummary ? { weatherSummary: cleanWeatherSummary } : {}),
    ...(cleanDestination ? { destination: cleanDestination } : {})
  };

  const primaryProvider = createOutfitAiProvider();
  let result;

  try {
    result = await primaryProvider.generateRecommendations(requestPayload);
  } catch (error) {
    await logRecommendationActivity(adminClient, {
      userId: user.id,
      eventType: "recommendation.generated",
      metadata: {
        provider: primaryProvider.name,
        model: primaryProvider.model,
        fallback_reason: error instanceof Error ? error.message : "unknown"
      }
    });

    result = await createFallbackOutfitProvider().generateRecommendations(requestPayload);
  }

  const topOutfit = result.outfits[0];
  const { data: savedRecommendation } = await supabase
    .from("outfit_recommendations")
    .insert({
      user_id: user.id,
      request_hash: hashRequest({
        occasion: parsed.data.occasion,
        weather: parsed.data.weather,
        season: parsed.data.season,
        itemIds: wardrobeItems.map((item) => item.id)
      }),
      occasion: parsed.data.occasion,
      season: parsed.data.season,
      weather_context: {
        weather: parsed.data.weather,
        weatherSummary: cleanWeatherSummary,
        destination: cleanDestination
      },
      ...(cleanDestination ? { destination: cleanDestination } : {}),
      prompt: "AI outfit recommendation v1",
      item_ids: topOutfit?.items.map((item) => item.id) ?? [],
      response: result as unknown as Json,
      score: topOutfit?.score ?? null,
      model_name: `${result.provider}:${result.model}`,
      status: "generated"
    })
    .select("id")
    .single();

  await incrementRecommendationUsage(adminClient, usage.id, usage.used);
  await logRecommendationActivity(adminClient, {
    userId: user.id,
    eventType: "recommendation.generated",
    entityType: "outfit_recommendations",
    ...(savedRecommendation?.id ? { entityId: savedRecommendation.id } : {}),
    metadata: {
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
      outfitCount: result.outfits.length,
      totalTokens: result.usage?.totalTokens
    }
  });

  return applySecurityHeaders(NextResponse.json({
    recommendationId: savedRecommendation?.id ?? null,
    result,
    usage: {
      used: usage.used + 1,
      limit: usage.limit,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd
    }
  }));
}
