import { redirect } from "next/navigation";
import { getAppUserRole, isActiveAdmin } from "@/roles/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    supabase,
    authUser: user,
    appUser: await getAppUserRole(supabase, user)
  };
}

export async function requireAdminPage() {
  const context = await requireAuthenticatedPage();

  if (!isActiveAdmin(context.appUser)) {
    redirect("/dashboard");
  }

  return context;
}
