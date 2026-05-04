import type { SupabaseClient, User } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { AppRole, AppUserRole } from "@/roles/types";
import type { Database } from "@/types/database";

function normalizeRole(value: unknown): AppRole {
  return value === "admin" ? "admin" : "user";
}

function normalizePlan(value: unknown): "free" | "pro" {
  return value === "pro" ? "pro" : "free";
}

export async function getAppUserRole(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<AppUserRole> {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,role,status,plan")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      id: user.id,
      email: user.email ?? "",
      role: normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role),
      status: "active",
      plan: normalizePlan(user.user_metadata?.plan ?? user.app_metadata?.plan)
    };
  }

  return {
    id: data.id,
    email: data.email,
    role: normalizeRole(data.role),
    status: data.status,
    plan: normalizePlan(data.plan)
  };
}

export function isActiveAdmin(user: AppUserRole) {
  if (user.role !== "admin" || user.status !== "active") {
    return false;
  }

  const whitelist = env.ADMIN_EMAIL_WHITELIST?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!whitelist?.length) {
    return true;
  }

  return whitelist.includes(user.email.toLowerCase());
}
