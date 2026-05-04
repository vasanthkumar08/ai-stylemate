import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseAdminConfigured } from "@/config/env";
import type { Database } from "@/types/database";

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
