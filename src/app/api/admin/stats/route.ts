import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAdminApi } from "@/lib/admin/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type TrendPoint = {
  date: string;
  label: string;
  users: number;
  outfits: number;
  uploads: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildTrendWindow() {
  const today = startOfDay(new Date());

  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));

    return {
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("en", { month: "short", day: "numeric" }),
      users: 0,
      outfits: 0,
      uploads: 0
    };
  });
}

function incrementTrend(points: TrendPoint[], rows: Array<{ created_at: string }>, key: "users" | "outfits" | "uploads") {
  for (const row of rows) {
    const dayKey = row.created_at.slice(0, 10);
    const point = points.find((item) => item.date === dayKey);

    if (point) {
      point[key] += 1;
    }
  }
}

async function safeCount(
  client: SupabaseClient<Database>,
  table: "users" | "wardrobe_items" | "outfit_recommendations"
) {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  return error ? 0 : count ?? 0;
}

async function fetchCreatedRows(
  client: SupabaseClient<Database>,
  table: "users" | "wardrobe_items" | "outfit_recommendations",
  since: string
) {
  const { data, error } = await client.from(table).select("created_at").gte("created_at", since).limit(600);

  return error || !data ? [] : (data as Array<{ created_at: string }>);
}

async function fetchPlanAnalytics(client: SupabaseClient<Database>, totalUsers: number, uploadCount: number, totalOutfits: number) {
  const { data, error } = await client
    .from("users")
    .select("plan,outfits_used_today,ai_scans_used_today")
    .is("deleted_at", null)
    .limit(5000);

  if (error || !data) {
    return {
      freeUsers: totalUsers,
      proUsers: 0,
      conversionRate: 0,
      mostUsedFeature: totalOutfits >= uploadCount ? "outfit_generation" : "wardrobe_upload",
      totalScans: 0,
      freeScans: 0,
      proScans: 0,
      conversionEvents: 0
    };
  }

  const rows = data as Array<{
    plan: string | null;
    outfits_used_today: number | null;
    ai_scans_used_today: number | null;
  }>;
  const proUsers = rows.filter((row) => row.plan === "pro").length;
  const freeUsers = Math.max(0, rows.length - proUsers);
  const freeScans = rows
    .filter((row) => row.plan !== "pro")
    .reduce((total, row) => total + (row.ai_scans_used_today ?? 0), 0);
  const proScans = rows
    .filter((row) => row.plan === "pro")
    .reduce((total, row) => total + (row.ai_scans_used_today ?? 0), 0);
  const totalScans = freeScans + proScans;
  const { count: conversionEvents } = await client
    .from("revenue_placeholder")
    .select("id", { count: "exact", head: true })
    .eq("plan", "pro")
    .eq("status", "active");
  const featureUsage = {
    outfit_generation: rows.reduce((total, row) => total + (row.outfits_used_today ?? 0), 0) || totalOutfits,
    ai_scan: totalScans,
    wardrobe_upload: uploadCount
  };
  const mostUsedFeature = Object.entries(featureUsage).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "outfit_generation";

  return {
    freeUsers,
    proUsers,
    conversionRate: rows.length ? Math.round((proUsers / rows.length) * 1000) / 10 : 0,
    mostUsedFeature,
    totalScans,
    freeScans,
    proScans,
    conversionEvents: conversionEvents ?? proUsers
  };
}

export const GET = withAdminApi(async () => {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return jsonError("Admin database client is not configured.", 503);
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const trend = buildTrendWindow();
  const since = `${trend[0]?.date ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const [totalUsers, activeUsers, totalOutfits, uploadCount, usageRows, userRows, outfitRows, uploadRows] =
    await Promise.all([
      safeCount(adminClient, "users"),
      adminClient.from("users").select("id", { count: "exact", head: true }).gte("last_sign_in_at", dayAgo),
      safeCount(adminClient, "outfit_recommendations"),
      safeCount(adminClient, "wardrobe_items"),
      adminClient.from("usage_limits").select("recommendations_used"),
      fetchCreatedRows(adminClient, "users", since),
      fetchCreatedRows(adminClient, "outfit_recommendations", since),
      fetchCreatedRows(adminClient, "wardrobe_items", since)
    ]);

  incrementTrend(trend, userRows, "users");
  incrementTrend(trend, outfitRows, "outfits");
  incrementTrend(trend, uploadRows, "uploads");

  const aiRequestsUsed =
    usageRows.error || !usageRows.data
      ? totalOutfits
      : usageRows.data.reduce((total, row) => total + (row.recommendations_used ?? 0), 0);
  const monetization = await fetchPlanAnalytics(adminClient, totalUsers, uploadCount, totalOutfits);

  return NextResponse.json({
    kpis: {
      totalUsers,
      activeUsers: activeUsers.error ? 0 : activeUsers.count ?? 0,
      totalOutfits,
      revenue: 12840,
      uploadCount,
      aiRequestsUsed
    },
    live: {
      users: totalUsers,
      uploads: uploadCount
    },
    monetization,
    trend: trend.map((point) => ({
      label: point.label,
      users: point.users,
      outfits: point.outfits,
      uploads: point.uploads
    }))
  });
});
