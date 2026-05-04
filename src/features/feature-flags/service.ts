import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppUserRole } from "@/roles/types";
import type { Database } from "@/types/database";

export type FeatureFlags = {
  aiScanEnabled: boolean;
  outfitGeneratorEnabled: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  aiScanEnabled: true,
  outfitGeneratorEnabled: true
};

function mapFlags(row: Database["public"]["Tables"]["feature_flags"]["Row"] | null | undefined): FeatureFlags {
  return {
    aiScanEnabled: row?.ai_scan_enabled ?? defaultFeatureFlags.aiScanEnabled,
    outfitGeneratorEnabled: row?.outfit_generator_enabled ?? defaultFeatureFlags.outfitGeneratorEnabled
  };
}

export async function getFeatureFlags(supabase?: SupabaseClient<Database>): Promise<FeatureFlags> {
  const client = supabase ?? createSupabaseAdminClient();

  if (!client) {
    return defaultFeatureFlags;
  }

  const { data, error } = await client
    .from("feature_flags")
    .select("id,ai_scan_enabled,outfit_generator_enabled,created_at,updated_at")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    return defaultFeatureFlags;
  }

  return mapFlags(data);
}

export async function updateFeatureFlags(updates: Partial<FeatureFlags>) {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    throw new Error("Admin database client is not configured.");
  }

  const current = await getFeatureFlags(adminClient);
  const { data, error } = await adminClient
    .from("feature_flags")
    .upsert({
      id: true,
      ai_scan_enabled: updates.aiScanEnabled ?? current.aiScanEnabled,
      outfit_generator_enabled: updates.outfitGeneratorEnabled ?? current.outfitGeneratorEnabled
    })
    .select("id,ai_scan_enabled,outfit_generator_enabled,created_at,updated_at")
    .single();

  if (error) {
    throw new Error("Could not update feature flags.");
  }

  return mapFlags(data);
}

export async function canUseAiScan(appUser: AppUserRole, supabase?: SupabaseClient<Database>) {
  if (appUser.role === "admin" || appUser.plan === "pro") {
    return { allowed: true, flags: await getFeatureFlags(supabase), reason: null as string | null };
  }

  const flags = await getFeatureFlags(supabase);

  return {
    allowed: flags.aiScanEnabled,
    flags,
    reason: flags.aiScanEnabled ? null : "AI Scan is currently disabled for free users."
  };
}

export async function canUseOutfitGenerator(appUser: AppUserRole, supabase?: SupabaseClient<Database>) {
  if (appUser.role === "admin") {
    return { allowed: true, flags: await getFeatureFlags(supabase), reason: null as string | null };
  }

  const flags = await getFeatureFlags(supabase);

  return {
    allowed: flags.outfitGeneratorEnabled,
    flags,
    reason: flags.outfitGeneratorEnabled ? null : "Outfit generation is currently disabled."
  };
}
