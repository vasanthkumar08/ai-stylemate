import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { normalizePlan, planEntitlements, type MeteredFeature, type PlanName } from "./plans";

export type UserPlanUsage = {
  plan: PlanName;
  dailyOutfitLimit: number | null;
  outfitsUsedToday: number;
  aiScanLimit: number | null;
  aiScansUsedToday: number;
  lastResetDate: string;
  remainingOutfits: number | null;
  remainingScans: number | null;
  advancedRecommendations: boolean;
  priority: "standard" | "priority";
};

type UserPlanRow = {
  id: string;
  plan?: string | null;
  daily_outfit_limit?: number | null;
  outfits_used_today?: number | null;
  ai_scan_limit?: number | null;
  ai_scans_used_today?: number | null;
  last_reset_date?: string | null;
};

function defaultFreePlanRow(userId: string): UserPlanRow {
  return {
    id: userId,
    plan: "free",
    daily_outfit_limit: planEntitlements.free.dailyOutfitLimit,
    outfits_used_today: 0,
    ai_scan_limit: planEntitlements.free.aiScanLimit,
    ai_scans_used_today: 0,
    last_reset_date: new Date().toISOString()
  };
}

export function defaultFreePlanUsage(userId: string): UserPlanUsage {
  return buildUsage(defaultFreePlanRow(userId));
}

function isRecoverablePlanError(code: string | undefined) {
  return code === "42703" || code === "42P01" || code === "PGRST116" || code === "PGRST205";
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function shouldReset(lastResetDate: string | null | undefined) {
  if (!lastResetDate) {
    return true;
  }

  return new Date(lastResetDate).getTime() < todayStart().getTime();
}

function buildUsage(row: UserPlanRow): UserPlanUsage {
  const plan = normalizePlan(row.plan);
  const entitlements = planEntitlements[plan];
  const dailyOutfitLimit =
    plan === "pro" ? null : row.daily_outfit_limit ?? entitlements.dailyOutfitLimit;
  const aiScanLimit = plan === "pro" ? null : row.ai_scan_limit ?? entitlements.aiScanLimit;
  const outfitsUsedToday = row.outfits_used_today ?? 0;
  const aiScansUsedToday = row.ai_scans_used_today ?? 0;

  return {
    plan,
    dailyOutfitLimit,
    outfitsUsedToday,
    aiScanLimit,
    aiScansUsedToday,
    lastResetDate: row.last_reset_date ?? new Date().toISOString(),
    remainingOutfits: dailyOutfitLimit === null ? null : Math.max(0, dailyOutfitLimit - outfitsUsedToday),
    remainingScans: aiScanLimit === null ? null : Math.max(0, aiScanLimit - aiScansUsedToday),
    advancedRecommendations: entitlements.advancedRecommendations,
    priority: entitlements.priority
  };
}

async function getUserPlanRow(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,plan,daily_outfit_limit,outfits_used_today,ai_scan_limit,ai_scans_used_today,last_reset_date")
    .eq("id", userId)
    .maybeSingle();

  if (isRecoverablePlanError(error?.code)) {
    return defaultFreePlanRow(userId);
  }

  if (error) {
    throw new Error("Could not load plan usage.");
  }

  if (!data) {
    return defaultFreePlanRow(userId);
  }

  return data as UserPlanRow;
}

async function resetIfNeeded(supabase: SupabaseClient<Database>, row: UserPlanRow) {
  if (!shouldReset(row.last_reset_date)) {
    return row;
  }

  const resetDate = new Date().toISOString();
  const { data, error } = await supabase
    .from("users")
    .update({
      outfits_used_today: 0,
      ai_scans_used_today: 0,
      last_reset_date: resetDate
    })
    .eq("id", row.id)
    .select("id,plan,daily_outfit_limit,outfits_used_today,ai_scan_limit,ai_scans_used_today,last_reset_date")
    .single();

  if (error) {
    return {
      ...row,
      outfits_used_today: 0,
      ai_scans_used_today: 0,
      last_reset_date: resetDate
    };
  }

  return data as UserPlanRow;
}

export async function checkUserPlan(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserPlanUsage> {
  const row = await getUserPlanRow(supabase, userId);
  const resetRow = await resetIfNeeded(supabase, row);
  return buildUsage(resetRow);
}

export async function enforcePlanLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: MeteredFeature
) {
  const usage = await checkUserPlan(supabase, userId);

  if (usage.plan === "pro") {
    return { allowed: true as const, usage };
  }

  const exhausted =
    feature === "outfit"
      ? usage.remainingOutfits !== null && usage.remainingOutfits <= 0
      : usage.remainingScans !== null && usage.remainingScans <= 0;

  if (exhausted) {
    return {
      allowed: false as const,
      usage,
      error: "Limit reached",
      upgradeRequired: true
    };
  }

  return { allowed: true as const, usage };
}

export async function checkScanAccess(supabase: SupabaseClient<Database>, userId: string) {
  const result = await enforcePlanLimit(supabase, userId, "ai_scan");

  if (result.allowed) {
    return {
      allowed: true as const,
      usage: result.usage,
      upgradeRequired: false,
      message: null as string | null
    };
  }

  return {
    allowed: false as const,
    usage: result.usage,
    upgradeRequired: true,
    message: "Free AI scan limit reached"
  };
}

export async function incrementPlanUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: MeteredFeature
) {
  const usage = await checkUserPlan(supabase, userId);

  if (usage.plan === "pro") {
    return usage;
  }

  const updates =
    feature === "outfit"
      ? { outfits_used_today: usage.outfitsUsedToday + 1 }
      : { ai_scans_used_today: usage.aiScansUsedToday + 1 };

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("id,plan,daily_outfit_limit,outfits_used_today,ai_scan_limit,ai_scans_used_today,last_reset_date")
    .single();

  if (error || !data) {
    return usage;
  }

  return buildUsage(data as UserPlanRow);
}
