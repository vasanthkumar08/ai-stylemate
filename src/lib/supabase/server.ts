import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env, requireFeatureEnv } from "@/config/env";
import type { Database } from "@/types/database";

export async function createSupabaseServerClient() {
  requireFeatureEnv("auth", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies. Middleware refreshes sessions.
          }
        }
      }
    }
  );
}
