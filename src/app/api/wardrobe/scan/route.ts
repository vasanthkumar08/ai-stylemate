import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { canUseAiScan } from "@/features/feature-flags/service";
import { checkScanAccess, incrementPlanUsage } from "@/features/monetization/service";
import { analyzeClothing, type ClothingScanResult } from "@/features/wardrobe/scan/analyzer";
import {
  CLOUDINARY_ALLOWED_IMAGE_TYPES,
  CLOUDINARY_MAX_IMAGE_BYTES,
  secureUploadImageToCloudinary,
  validateCloudinaryImageInput
} from "@/lib/cloudinary/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAppUserRole } from "@/roles/service";

export const runtime = "nodejs";

type SuggestionRow = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  colors: string[] | null;
  image_url: string;
};

function toWardrobeCategory(category: ClothingScanResult["category"]) {
  if (category === "Bottom") return "bottom";
  if (category === "Shoes") return "shoes";
  if (category === "Outerwear") return "outerwear";
  return "top";
}

function buildSuggestionCategories(category: ClothingScanResult["category"]) {
  if (category === "Top" || category === "Outerwear") return ["bottom", "shoes"];
  if (category === "Bottom") return ["top", "shoes"];
  return ["top", "bottom"];
}

async function getSuggestions(userId: string, metadata: ClothingScanResult) {
  const supabase = await createSupabaseRouteHandlerClient();
  const categories = buildSuggestionCategories(metadata.category);
  const createQuery = () =>
    supabase
      .from("wardrobe_items")
      .select("id,name,category,subcategory,colors,image_url")
      .eq("user_id", userId)
      .in("category", categories)
      .limit(6);

  let { data, error } = await createQuery().is("deleted_at", null);

  if (error?.code === "42703") {
    ({ data, error } = await createQuery());
  }

  if (error || !data) {
    return [];
  }

  return (data as SuggestionRow[]).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.subcategory ?? item.category,
    color: item.colors?.[0] ?? "Neutral",
    imageUrl: item.image_url
  }));
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, {
    bucket: "wardrobe-scan",
    windowMs: 60_000,
    max: 10
  });

  if (!limited.allowed) {
    return jsonError("Too many scan requests. Please wait a minute.", 429);
  }

  if (!assertTrustedPost(request)) {
    return jsonError("Scan request was blocked.", 403);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("You must be signed in to scan wardrobe items.", 401);
  }

  const appUser = await getAppUserRole(supabase, user);
  const scanAccess = await canUseAiScan(appUser, supabase);

  if (!scanAccess.allowed) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "AI Scan is disabled",
          featureDisabled: true,
          upgradeRequired: appUser.plan !== "pro"
        },
        { status: 403 }
      )
    );
  }

  const limit = await checkScanAccess(supabase, user.id);

  if (!limit.allowed) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: limit.message,
          upgradeRequired: limit.upgradeRequired,
          usage: limit.usage
        },
        { status: 402 }
      )
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Choose an image to scan.", 400);
  }

  if (!CLOUDINARY_ALLOWED_IMAGE_TYPES.includes(file.type as (typeof CLOUDINARY_ALLOWED_IMAGE_TYPES)[number])) {
    return jsonError("Only JPEG, PNG, and WebP images are supported.", 415);
  }

  if (file.size > CLOUDINARY_MAX_IMAGE_BYTES) {
    return jsonError("Image must be 5 MB or smaller.", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateCloudinaryImageInput({ buffer, mimeType: file.type });

  if (!validation.ok) {
    return jsonError(validation.message, validation.code === "file_too_large" ? 413 : 415);
  }

  const fileSha256 = createHash("sha256").update(buffer).digest("hex");
  const cloudinaryResult = await secureUploadImageToCloudinary({
    buffer,
    mimeType: file.type,
    userId: user.id,
    originalFileName: file.name
  }).catch((error: unknown) => {
    console.error("[stylemate-scan-cloudinary]", {
      userId: user.id,
      message: error instanceof Error ? error.message : "Cloudinary upload failed"
    });

    return null;
  });

  if (!cloudinaryResult) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "Cloudinary upload is not configured correctly. Add a real CLOUDINARY_API_SECRET in .env.local, then restart the dev server.",
          setupRequired: true
        },
        { status: 503 }
      )
    );
  }

  const metadata = await analyzeClothing({
    imageUrl: cloudinaryResult.optimizedUrl,
    width: cloudinaryResult.width ?? null,
    height: cloudinaryResult.height ?? null,
    originalFileName: file.name
  });
  const suggestions = await getSuggestions(user.id, metadata);
  const usage = await incrementPlanUsage(supabase, user.id, "ai_scan");
  const adminClient = createSupabaseAdminClient();

  if (adminClient) {
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      event_type: "ai_scan.completed",
      entity_type: "ai_scan",
      metadata: {
        plan: usage.plan,
        quota_type: usage.plan === "pro" ? "unlimited" : "free",
        provider: metadata.provider,
        category: metadata.category,
        confidence: metadata.confidence
      }
    });
  }

  return applySecurityHeaders(
    NextResponse.json({
      scan: {
        imageUrl: cloudinaryResult.optimizedUrl,
        cloudinaryPublicId: cloudinaryResult.publicId,
        originalUrl: cloudinaryResult.secureUrl,
        width: cloudinaryResult.width ?? null,
        height: cloudinaryResult.height ?? null,
        bytes: cloudinaryResult.bytes,
        format: cloudinaryResult.format,
        fileSha256
      },
      metadata: {
        ...metadata,
        wardrobeCategory: toWardrobeCategory(metadata.category)
      },
      suggestions,
      usage
    })
  );
}
