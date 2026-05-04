import { redirect } from "next/navigation";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { requireAdminUser } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const admin = await requireAdminUser(supabase);

  if (!admin.ok) {
    redirect("/dashboard");
  }

  return <AdminDashboard adminUser={admin.user} />;
}
