import { NextResponse } from "next/server";
import { checkUserPlan, defaultFreePlanUsage } from "@/features/monetization/service";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { applySecurityHeaders, jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return jsonError("You must be signed in to view usage.", 401);
  }

  try {
    const usage = await checkUserPlan(supabase, user.id);
    return applySecurityHeaders(NextResponse.json({ usage }));
  } catch (caughtError) {
    console.warn("[stylemate-monetization-usage] using free fallback", {
      userId: user.id,
      message: caughtError instanceof Error ? caughtError.message : "unknown"
    });

    return applySecurityHeaders(
      NextResponse.json({
        usage: defaultFreePlanUsage(user.id),
        fallback: true
      })
    );
  }
}
