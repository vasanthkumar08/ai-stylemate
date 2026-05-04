import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applySecurityHeaders, jsonError } from "@/lib/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return jsonError("Cron secret is not configured.", 503);
  }

  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return jsonError("Cron request is not authorized.", 401);
  }

  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return jsonError("Admin database client is not configured.", 503);
  }

  const resetDate = new Date().toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { error } = await adminClient
    .from("users")
    .update({
      outfits_used_today: 0,
      ai_scans_used_today: 0,
      last_reset_date: resetDate
    })
    .lt("last_reset_date", today.toISOString());

  if (error) {
    return jsonError("Could not reset daily usage.", 500);
  }

  return applySecurityHeaders(
    NextResponse.json({
      ok: true,
      resetAt: resetDate
    })
  );
}
