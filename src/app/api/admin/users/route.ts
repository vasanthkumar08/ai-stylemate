import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminApi } from "@/lib/admin/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

const userActionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["ban", "promote", "delete"])
});

function mapStatus(status: string) {
  return status === "disabled" || status === "pending_deletion" ? "banned" : "active";
}

export const GET = withAdminApi(async () => {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return jsonError("Admin database client is not configured.", 503);
  }

  const { data, error } = await adminClient
    .from("users")
    .select("id,email,full_name,role,status,last_sign_in_at,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return jsonError("Could not load users.", 500);
  }

  return NextResponse.json({
    users: (data ?? []).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.full_name ?? "Unnamed user",
      role: user.role === "admin" ? "admin" : "user",
      status: mapStatus(user.status),
      lastLogin: user.last_sign_in_at
    }))
  });
});

export const PATCH = withAdminApi(async ({ request }) => {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return jsonError("Admin database client is not configured.", 503);
  }

  const parsed = userActionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError(parsed.error.issues.at(0)?.message ?? "Invalid user action.", 400);
  }

  const updates =
    parsed.data.action === "promote"
      ? { role: "admin" }
      : parsed.data.action === "ban"
        ? { status: "disabled" }
        : { status: "pending_deletion", deleted_at: new Date().toISOString() };

  const { error } = await adminClient.from("users").update(updates).eq("id", parsed.data.userId);

  if (error) {
    return jsonError("Could not update user.", 500);
  }

  return NextResponse.json({ ok: true });
});

export const DELETE = withAdminApi(async ({ request }) => {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return jsonError("Admin database client is not configured.", 503);
  }

  const userId = new URL(request.url).searchParams.get("userId");

  if (!userId || !z.string().uuid().safeParse(userId).success) {
    return jsonError("A valid userId is required.", 400);
  }

  const { error } = await adminClient
    .from("users")
    .update({ status: "pending_deletion", deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return jsonError("Could not delete user.", 500);
  }

  return NextResponse.json({ ok: true });
});
