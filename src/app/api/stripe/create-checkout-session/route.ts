import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createProCheckoutSession } from "@/features/billing/stripe";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isStripeCheckoutConfigured } from "@/lib/env";
import { applySecurityHeaders, assertTrustedPost, jsonError } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const checkoutRequestSchema = z.object({
  userId: z.string().uuid().optional()
});

export async function POST(request: NextRequest) {
  if (!isStripeCheckoutConfigured()) {
    return jsonError("Billing temporarily unavailable.", 503);
  }

  const limited = checkRateLimit(request, {
    bucket: "stripe-checkout",
    windowMs: 60_000,
    max: 8
  });

  if (!limited.allowed) {
    return jsonError("Too many checkout attempts. Please wait a minute.", 429);
  }

  if (!assertTrustedPost(request)) {
    return jsonError("Checkout request was blocked.", 403);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return jsonError("You must be signed in to upgrade.", 401);
  }

  const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return jsonError(parsed.error.issues.at(0)?.message ?? "Checkout request is invalid.", 400);
  }

  if (parsed.data.userId && parsed.data.userId !== user.id) {
    return jsonError("You can only upgrade your own account.", 403);
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id,email,plan,stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (appUserError || !appUser) {
    return jsonError("Could not load your billing profile.", 500);
  }

  if (appUser.plan === "pro") {
    return applySecurityHeaders(NextResponse.json({ alreadyPro: true, url: "/dashboard" }));
  }

  try {
    const session = await createProCheckoutSession({
      userId: user.id,
      email: appUser.email || user.email,
      stripeCustomerId: appUser.stripe_customer_id
    });

    return applySecurityHeaders(NextResponse.json({ url: session.url }));
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : "Could not start checkout.", 503);
  }
}
