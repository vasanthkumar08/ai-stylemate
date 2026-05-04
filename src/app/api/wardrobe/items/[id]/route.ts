import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteCloudinaryImage } from "@/lib/cloudinary/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { logSecurityEvent } from "@/lib/security/anomaly";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

function getOptionalString(row: unknown, key: string) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminClient = createSupabaseAdminClient();
  const limited = checkRateLimit(request, {
    bucket: "wardrobe-delete",
    windowMs: 60_000,
    max: 30
  });

  if (!limited.allowed) {
    return jsonError("Too many delete requests. Please wait a minute.", 429);
  }

  if (!assertTrustedPost(request)) {
    await logSecurityEvent(adminClient, request, {
      action: "wardrobe.delete",
      severity: "high",
      reason: "untrusted_delete"
    });
    return jsonError("Delete request was blocked.", 403);
  }

  const { id: rawId } = await params;
  const parsedId = z.string().uuid().safeParse(rawId);

  if (!parsedId.success) {
    return jsonError("Wardrobe item was not found.", 404);
  }

  const id = parsedId.data;
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("You must be signed in to delete wardrobe items.", 401);
  }

  const createItemQuery = () =>
    supabase
      .from("wardrobe_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id);

  let { data: item, error: itemError } = await createItemQuery()
    .is("deleted_at", null)
    .single();

  if (isMissingColumnError(itemError?.code)) {
    ({ data: item, error: itemError } = await createItemQuery().single());
  }

  if (itemError || !item) {
    return jsonError("Wardrobe item was not found.", 404);
  }

  const cloudinaryPublicId = getOptionalString(item, "cloudinary_public_id");

  if (cloudinaryPublicId) {
    try {
      await deleteCloudinaryImage(cloudinaryPublicId);
    } catch (error) {
      console.error("[stylemate-cloudinary-delete]", {
        userId: user.id,
        itemId: id,
        message: error instanceof Error ? error.message : "unknown"
      });
      return jsonError("Could not delete wardrobe image.", 502);
    }
  }

  const { error: updateError } = await supabase
    .from("wardrobe_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    if (!isMissingColumnError(updateError.code)) {
      return jsonError("Could not delete wardrobe item.", 500);
    }

    const { error: deleteError } = await supabase
      .from("wardrobe_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return jsonError("Could not delete wardrobe item.", 500);
    }
  }

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
