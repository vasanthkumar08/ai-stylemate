import type { ReactNode } from "react";
import { AppShellClient } from "@/components/layout/app-shell-client";
import { getCsrfToken } from "@/lib/auth/csrf-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUserRole } from "@/roles/service";
import type { AppRole } from "@/roles/types";

export async function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const csrfToken = await getCsrfToken();
  let role: AppRole = "user";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      role = (await getAppUserRole(supabase, user)).role;
    }
  } catch {
    role = "user";
  }

  return <AppShellClient csrfToken={csrfToken} role={role}>{children}</AppShellClient>;
}
