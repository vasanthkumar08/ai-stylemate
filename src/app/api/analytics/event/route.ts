import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applySecurityHeaders, assertSameOrigin, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) {
    return jsonError("Analytics event blocked.", 403);
  }

  const limited = checkRateLimit(request, {
    bucket: "analytics-event",
    windowMs: 60_000,
    max: 120
  });

  if (!limited.allowed) {
    return jsonError("Too many analytics events.", 429);
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    path?: string;
    payload?: Record<string, Json>;
  } | null;

  if (!body?.name) {
    return jsonError("Invalid analytics event.", 400);
  }

  const event = {
    name: sanitizeText(body.name, 80),
    path: sanitizeText(body.path ?? "/", 200),
    payload: body.payload ?? {},
    timestamp: new Date().toISOString()
  };

  console.info("[stylemate-analytics]", event);

  const adminClient = createSupabaseAdminClient();

  if (adminClient) {
    await adminClient.from("activity_logs").insert({
      event_type: "activity.anomaly",
      entity_type: "analytics",
      metadata: event
    });
  }

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
