import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applySecurityHeaders, assertSameOrigin, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

async function forwardToWebhook(payload: Record<string, Json>) {
  if (!env.MONITORING_WEBHOOK_URL) {
    return;
  }

  await fetch(env.MONITORING_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000)
  }).catch(() => undefined);
}

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) {
    return jsonError("Monitoring event blocked.", 403);
  }

  const limited = checkRateLimit(request, {
    bucket: "monitoring-error",
    windowMs: 60_000,
    max: 60
  });

  if (!limited.allowed) {
    return jsonError("Too many monitoring events.", 429);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return jsonError("Invalid monitoring event.", 400);
  }

  const event: Record<string, Json> = {
    type: sanitizeText(String(body.type ?? "client_error"), 80),
    message: sanitizeText(String(body.message ?? "Unknown client error"), 500),
    path: sanitizeText(String(body.path ?? "/"), 200),
    stack: sanitizeText(String(body.stack ?? ""), 4000),
    timestamp: sanitizeText(String(body.timestamp ?? new Date().toISOString()), 80)
  };

  console.error("[stylemate-monitoring]", event);

  const adminClient = createSupabaseAdminClient();

  if (adminClient) {
    await adminClient.from("activity_logs").insert({
      event_type: "activity.anomaly",
      entity_type: "client_error",
      metadata: event
    });
  }

  await forwardToWebhook(event);

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
