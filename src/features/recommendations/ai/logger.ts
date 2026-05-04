import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type LogParams = {
  userId: string;
  eventType: "recommendation.generated" | "usage.incremented";
  entityType?: string;
  entityId?: string;
  metadata: Record<string, Json | undefined>;
};

export async function logRecommendationActivity(
  adminClient: SupabaseClient<Database> | null,
  params: LogParams
) {
  const safeMetadata = Object.fromEntries(
    Object.entries(params.metadata).filter(([, value]) => value !== undefined)
  ) as Record<string, Json>;

  console.info("[stylemate-ai]", {
    eventType: params.eventType,
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: safeMetadata
  });

  if (!adminClient) {
    return;
  }

  await adminClient.from("activity_logs").insert({
    user_id: params.userId,
    event_type: params.eventType,
    ...(params.entityType ? { entity_type: params.entityType } : {}),
    ...(params.entityId ? { entity_id: params.entityId } : {}),
    metadata: safeMetadata
  });
}
