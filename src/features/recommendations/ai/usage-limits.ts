import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const FREE_RECOMMENDATIONS_LIMIT = 20;

function getCurrentPeriod() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10)
  };
}

export async function getRecommendationUsage(
  adminClient: SupabaseClient<Database> | null,
  userClient: SupabaseClient<Database>,
  userId: string
) {
  const client = adminClient ?? userClient;
  const { periodStart, periodEnd } = getCurrentPeriod();
  const { data } = await client
    .from("usage_limits")
    .select("id,recommendations_used,recommendations_limit,period_start,period_end")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .is("deleted_at", null)
    .maybeSingle();

  if (data) {
    return {
      allowed: data.recommendations_used < data.recommendations_limit,
      id: data.id,
      used: data.recommendations_used,
      limit: data.recommendations_limit,
      periodStart: data.period_start,
      periodEnd: data.period_end
    };
  }

  if (adminClient) {
    const { data: created } = await adminClient
      .from("usage_limits")
      .insert({
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        recommendations_used: 0,
        recommendations_limit: FREE_RECOMMENDATIONS_LIMIT
      })
      .select("id,recommendations_used,recommendations_limit,period_start,period_end")
      .single();

    if (created) {
      return {
        allowed: true,
        id: created.id,
        used: created.recommendations_used,
        limit: created.recommendations_limit,
        periodStart: created.period_start,
        periodEnd: created.period_end
      };
    }
  }

  return {
    allowed: true,
    id: null,
    used: 0,
    limit: FREE_RECOMMENDATIONS_LIMIT,
    periodStart,
    periodEnd
  };
}

export async function incrementRecommendationUsage(
  adminClient: SupabaseClient<Database> | null,
  usageId: string | null,
  used: number
) {
  if (!adminClient || !usageId) {
    return;
  }

  await adminClient
    .from("usage_limits")
    .update({ recommendations_used: used + 1 })
    .eq("id", usageId);
}

export async function getUploadUsage(
  adminClient: SupabaseClient<Database> | null,
  userClient: SupabaseClient<Database>,
  userId: string
) {
  const client = adminClient ?? userClient;
  const { periodStart, periodEnd } = getCurrentPeriod();
  const { data } = await client
    .from("usage_limits")
    .select("id,uploads_used,uploads_limit,period_start,period_end")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .is("deleted_at", null)
    .maybeSingle();

  if (data) {
    return {
      allowed: data.uploads_used < data.uploads_limit,
      id: data.id,
      used: data.uploads_used,
      limit: data.uploads_limit,
      periodStart: data.period_start,
      periodEnd: data.period_end
    };
  }

  if (adminClient) {
    const { data: created } = await adminClient
      .from("usage_limits")
      .insert({
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        uploads_used: 0,
        uploads_limit: 100
      })
      .select("id,uploads_used,uploads_limit,period_start,period_end")
      .single();

    if (created) {
      return {
        allowed: true,
        id: created.id,
        used: created.uploads_used,
        limit: created.uploads_limit,
        periodStart: created.period_start,
        periodEnd: created.period_end
      };
    }
  }

  return {
    allowed: true,
    id: null,
    used: 0,
    limit: 100,
    periodStart,
    periodEnd
  };
}

export async function incrementUploadUsage(
  adminClient: SupabaseClient<Database> | null,
  usageId: string | null,
  used: number
) {
  if (!adminClient || !usageId) {
    return;
  }

  await adminClient.from("usage_limits").update({ uploads_used: used + 1 }).eq("id", usageId);
}
