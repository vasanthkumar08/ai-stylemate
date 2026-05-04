import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canUseAiScan } from "@/features/feature-flags/service";
import { buildWardrobePayload } from "@/features/wardrobe/scan/confirm-insert";
import { mapWardrobeItemTypeToCategory, wardrobeItemTypeSchema } from "@/features/wardrobe/schemas";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { sanitizeText } from "@/lib/security/sanitize";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getAppUserRole } from "@/roles/service";

export const runtime = "nodejs";

const confirmSchema = z.object({
  name: z.string().trim().min(1).max(80),
  itemType: wardrobeItemTypeSchema,
  imageUrl: z.string().url(),
  cloudinaryPublicId: z.string().min(3).max(240),
  fileSha256: z.string().min(32).max(128),
  metadata: z.object({
    category: z.enum(["Top", "Bottom", "Shoes", "Outerwear"]),
    color: z.string().trim().min(1).max(40),
    fabric: z.string().trim().min(1).max(60),
    style: z.enum(["Formal", "Casual", "Streetwear"]),
    confidence: z.number().min(0).max(100),
    provider: z.enum(["openai", "rule-based"])
  })
});

export async function POST(request: NextRequest) {
  if (!assertTrustedPost(request)) {
    return jsonError("Scan confirmation was blocked.", 403);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("You must be signed in to add wardrobe items.", 401);
  }

  console.info("[stylemate-scan-confirm] authenticated user", { userId: user.id });

  const appUser = await getAppUserRole(supabase, user);
  const scanAccess = await canUseAiScan(appUser, supabase);

  if (!scanAccess.allowed) {
    return jsonError("AI Scan is disabled.", 403);
  }

  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.issues.at(0)?.message ?? "Scan confirmation is invalid.", 400);
  }

  const safeUserId = user.id.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!parsed.data.cloudinaryPublicId.includes(`/wardrobe/${safeUserId}/`)) {
    return jsonError("Scan upload does not belong to this user.", 403);
  }

  const payload = buildWardrobePayload({
    userId: user.id,
    name: sanitizeText(parsed.data.name, 80),
    itemType: parsed.data.itemType,
    category: mapWardrobeItemTypeToCategory(parsed.data.itemType),
    imageUrl: parsed.data.imageUrl,
    cloudinaryPublicId: parsed.data.cloudinaryPublicId,
    fileSha256: parsed.data.fileSha256,
    color: sanitizeText(parsed.data.metadata.color, 40),
    fabric: sanitizeText(parsed.data.metadata.fabric, 60),
    metadata: parsed.data.metadata
  });

  if (payload.user_id !== user.id) {
    return jsonError("Wardrobe ownership validation failed.", 403);
  }

  console.info("[stylemate-scan-confirm] final payload keys", {
    userId: user.id,
    keys: Object.keys(payload).sort()
  });

  const { data, error } = await supabase
    .from("wardrobe_items")
    .insert(payload)
    .select("id,name,image_url")
    .single();

  if (error) {
    console.error("[stylemate-scan-confirm] insert failed", {
      userId: user.id,
      code: error.code,
      message: error.message
    });

    if (error.code === "42501") {
      return jsonError("Wardrobe insert is blocked by RLS. Apply the wardrobe compatibility migration.", 403);
    }

    return jsonError("Could not add scan to wardrobe.", 500);
  }

  console.info("[stylemate-scan-confirm] insert success", { userId: user.id, itemId: data.id });

  return applySecurityHeaders(NextResponse.json({ item: data }, { status: 201 }));
}
