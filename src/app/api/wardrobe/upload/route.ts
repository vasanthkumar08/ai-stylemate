import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import {
  mapWardrobeItemTypeToCategory,
  wardrobeUploadApiSchema,
  wardrobeUploadV2ApiSchema
} from "@/features/wardrobe/schemas";
import { getUploadUsage, incrementUploadUsage } from "@/features/recommendations/ai/usage-limits";
import {
  CLOUDINARY_ALLOWED_IMAGE_TYPES,
  CLOUDINARY_MAX_IMAGE_BYTES,
  deleteCloudinaryImage,
  secureUploadImageToCloudinary,
  validateCloudinaryImageInput
} from "@/lib/cloudinary/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { logSecurityEvent } from "@/lib/security/anomaly";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const adminClient = createSupabaseAdminClient();
  const limited = checkRateLimit(request, {
    bucket: "wardrobe-upload",
    windowMs: 60_000,
    max: 20
  });

  if (!limited.allowed) {
    await logSecurityEvent(adminClient, request, {
      action: "wardrobe.upload",
      severity: "medium",
      reason: "rate_limit_exceeded"
    });
    return jsonError("Too many uploads. Please wait a minute.", 429);
  }

  if (!assertTrustedPost(request)) {
    await logSecurityEvent(adminClient, request, {
      action: "wardrobe.upload",
      severity: "high",
      reason: "untrusted_post"
    });
    return jsonError("Upload request was blocked.", 403);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("You must be signed in to upload wardrobe items.", 401);
  }

  const userLimited = checkRateLimit(request, {
    bucket: `wardrobe-upload-user:${user.id}`,
    windowMs: 60_000,
    max: 12
  });

  if (!userLimited.allowed) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "wardrobe.upload",
      severity: "medium",
      reason: "user_rate_limit_exceeded"
    });
    return jsonError("Too many uploads. Please wait a minute.", 429);
  }

  const usage = await getUploadUsage(adminClient, supabase, user.id);

  if (!usage.allowed) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "wardrobe.upload",
      severity: "medium",
      reason: "monthly_upload_limit_exceeded",
      metadata: { used: usage.used, limit: usage.limit }
    });
    return jsonError("Monthly upload limit reached.", 429);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Choose an image to upload.", 400);
  }

  if (!CLOUDINARY_ALLOWED_IMAGE_TYPES.includes(file.type as (typeof CLOUDINARY_ALLOWED_IMAGE_TYPES)[number])) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "wardrobe.upload",
      severity: "medium",
      reason: "invalid_mime",
      metadata: { mimeType: file.type }
    });
    return jsonError("Only JPEG, PNG, and WebP images are supported.", 415);
  }

  if (file.size > CLOUDINARY_MAX_IMAGE_BYTES) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "wardrobe.upload",
      severity: "medium",
      reason: "file_too_large",
      metadata: { fileSize: file.size }
    });
    return jsonError("Image must be 5 MB or smaller.", 413);
  }

  const uploadMetadata = {
    name: formData.get("name"),
    itemType: formData.get("itemType"),
    category: formData.get("category"),
    color: formData.get("color") || undefined,
    season: formData.get("season") || undefined,
    fabric: formData.get("fabric") || undefined,
    brand: formData.get("brand") || undefined,
    fit: formData.get("fit") || undefined
  };
  const v2Metadata = wardrobeUploadV2ApiSchema.safeParse(uploadMetadata);
  const legacyMetadata = wardrobeUploadApiSchema.safeParse(uploadMetadata);

  if (!v2Metadata.success && !legacyMetadata.success) {
    return jsonError(
      v2Metadata.error.issues.at(0)?.message ??
        legacyMetadata.error.issues.at(0)?.message ??
        "Wardrobe metadata is invalid.",
      400
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const imageValidation = validateCloudinaryImageInput({ buffer, mimeType: file.type });

  if (!imageValidation.ok) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "wardrobe.upload",
      severity: "high",
      reason: imageValidation.code,
      metadata: { mimeType: file.type, fileSize: file.size }
    });
    return jsonError(imageValidation.message, imageValidation.code === "file_too_large" ? 413 : 415);
  }

  const fileSha256 = createHash("sha256").update(buffer).digest("hex");
  const createDuplicateQuery = () =>
    supabase
      .from("wardrobe_items")
      .select("id")
      .eq("user_id", user.id)
      .filter("ai_attributes->>file_sha256", "eq", fileSha256);

  let { data: duplicate, error: duplicateError } = await createDuplicateQuery()
    .is("deleted_at", null)
    .maybeSingle();

  if (duplicateError?.code === "42703") {
    ({ data: duplicate, error: duplicateError } = await createDuplicateQuery().maybeSingle());
  }

  if (duplicateError) {
    console.error("[stylemate-upload]", {
      userId: user.id,
      stage: "duplicate-check",
      code: duplicateError.code,
      message: duplicateError.message
    });
    return jsonError("Could not validate wardrobe image.", 500);
  }

  if (duplicate) {
    await logSecurityEvent(adminClient, request, {
      userId: user.id,
      action: "wardrobe.upload",
      severity: "low",
      reason: "duplicate_upload",
      metadata: { fileSha256 }
    });
    return jsonError("This image already exists in your wardrobe.", 409);
  }

  let cloudinaryResult;

  try {
    cloudinaryResult = await secureUploadImageToCloudinary({
      buffer,
      mimeType: file.type,
      userId: user.id,
      originalFileName: file.name
    });
  } catch (error) {
    console.error("[stylemate-upload]", {
      userId: user.id,
      stage: "cloudinary",
      message: error instanceof Error ? error.message : "unknown"
    });
    return jsonError("Could not upload wardrobe image.", 502);
  }
  const parsedMetadata = v2Metadata.success
    ? {
        ...v2Metadata.data,
        category: mapWardrobeItemTypeToCategory(v2Metadata.data.itemType),
        subcategory: v2Metadata.data.itemType
      }
    : legacyMetadata.success
      ? {
          ...legacyMetadata.data,
          itemType: legacyMetadata.data.category,
          subcategory: null
        }
      : null;

  if (!parsedMetadata) {
    return jsonError("Wardrobe metadata is invalid.", 400);
  }
  const cleanName = sanitizeText(parsedMetadata.name, 80);
  const seasonTags =
    parsedMetadata.season && parsedMetadata.season !== "all-season" ? [parsedMetadata.season] : [];

  const { data, error } = await supabase
    .from("wardrobe_items")
    .insert({
      user_id: user.id,
      name: cleanName,
      category: parsedMetadata.category,
      subcategory: parsedMetadata.subcategory,
      brand: sanitizeOptionalText(parsedMetadata.brand, 80) || null,
      colors: parsedMetadata.color ? [sanitizeText(parsedMetadata.color, 40)] : [],
      season_tags: seasonTags,
      material_tags: parsedMetadata.fabric ? [sanitizeText(parsedMetadata.fabric, 60)] : [],
      image_url: cloudinaryResult.optimizedUrl,
      cloudinary_public_id: cloudinaryResult.publicId,
      ai_attributes: {
        fit: parsedMetadata.fit ?? null,
        item_type: parsedMetadata.itemType,
        file_sha256: fileSha256,
        original_file_name: file.name,
        uploaded_mime_type: file.type,
        cloudinary_format: cloudinaryResult.format,
        cloudinary_bytes: cloudinaryResult.bytes,
        cloudinary_original_url: cloudinaryResult.secureUrl,
        cloudinary_width: cloudinaryResult.width ?? null,
        cloudinary_height: cloudinaryResult.height ?? null
      }
    } as never)
    .select("id,name,image_url,cloudinary_public_id")
    .single();

  if (error) {
    console.error("[stylemate-upload]", { userId: user.id, code: error.code, message: error.message });
    try {
      await deleteCloudinaryImage(cloudinaryResult.publicId);
    } catch (deleteError) {
      console.error("[stylemate-upload]", {
        userId: user.id,
        stage: "cloudinary-cleanup",
        message: deleteError instanceof Error ? deleteError.message : "unknown"
      });
    }
    return jsonError("Could not save wardrobe item.", 500);
  }

  await incrementUploadUsage(adminClient, usage.id, usage.used);

  return applySecurityHeaders(NextResponse.json({ item: data }, { status: 201 }));
}
