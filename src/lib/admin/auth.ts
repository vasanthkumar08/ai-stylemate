import type { SupabaseClient } from "@supabase/supabase-js";
import { isActiveAdmin } from "@/roles/service";
import type { Database } from "@/types/database";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin";
  status: string;
};

export type AdminAuthResult =
  | { ok: true; user: AdminUser }
  | { ok: false; status: 401 | 403 | 503; message: string };

export async function requireAdminUser(supabase: SupabaseClient<Database>): Promise<AdminAuthResult> {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 503, message: "Could not verify admin permissions." };
  }

  if (
    !data ||
    !isActiveAdmin({
      id: data.id,
      email: data.email,
      role: data.role === "admin" ? "admin" : "user",
      status: data.status,
      plan: "free"
    })
  ) {
    return { ok: false, status: 403, message: "Admin access required." };
  }

  return {
    ok: true,
    user: {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: "admin",
      status: data.status
    }
  };
}
