import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { requireAdminUser } from "./auth";

export function withAdminApi(
  handler: (context: { request: NextRequest }) => Promise<NextResponse>
) {
  return async function adminApiHandler(request: NextRequest) {
    if (request.method !== "GET" && !assertTrustedPost(request)) {
      return jsonError("Admin request was blocked.", 403);
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const admin = await requireAdminUser(supabase);

    if (!admin.ok) {
      return jsonError(admin.message, admin.status);
    }

    return applySecurityHeaders(await handler({ request }));
  };
}
