import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database, Json } from "@/types/database";
import { getClientIp } from "./http";

type AnomalySeverity = "low" | "medium" | "high";

export async function logSecurityEvent(
  adminClient: SupabaseClient<Database> | null,
  request: NextRequest,
  params: {
    userId?: string;
    action: string;
    severity: AnomalySeverity;
    reason: string;
    metadata?: Record<string, Json | undefined>;
  }
) {
  const metadata = {
    action: params.action,
    severity: params.severity,
    reason: params.reason,
    path: request.nextUrl.pathname,
    method: request.method,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 240) ?? "unknown",
    ...(params.metadata ?? {})
  };

  console.warn("[stylemate-security]", metadata);

  if (!adminClient) {
    return;
  }

  await adminClient.from("activity_logs").insert({
    ...(params.userId ? { user_id: params.userId } : {}),
    event_type: "activity.anomaly",
    entity_type: "security",
    metadata: metadata as Record<string, Json>
  });
}
