import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  metadataUserId,
  stringField,
  verifyStripeWebhook,
  type StripeEvent
} from "@/features/billing/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applySecurityHeaders, jsonError } from "@/lib/security/http";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminClient = SupabaseClient<Database>;

async function activateProPlan(
  adminClient: AdminClient,
  {
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    checkoutSessionId
  }: {
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    checkoutSessionId?: string | null;
  }
) {
  const { error } = await adminClient
    .from("users")
    .update({
      plan: "pro",
      status: "active",
      subscription_status: "active",
      stripe_customer_id: stripeCustomerId,
      subscription_id: stripeSubscriptionId,
      daily_outfit_limit: 0,
      ai_scan_limit: 0
    })
    .eq("id", userId);

  if (error) {
    throw new Error("Could not activate Pro plan.");
  }

  await adminClient.from("revenue_placeholder").insert({
    user_id: userId,
    plan: "pro",
    status: "active",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_checkout_session_id: checkoutSessionId ?? null
  });
}

async function markPaymentProblem(adminClient: AdminClient, stripeSubscriptionId: string | null) {
  if (!stripeSubscriptionId) {
    return;
  }

  await adminClient
    .from("users")
    .update({
      plan: "free",
      subscription_status: "past_due",
      daily_outfit_limit: 3,
      ai_scan_limit: 10
    })
    .eq("subscription_id", stripeSubscriptionId);
}

async function markSubscriptionCancelled(adminClient: AdminClient, stripeSubscriptionId: string | null) {
  if (!stripeSubscriptionId) {
    return;
  }

  await adminClient
    .from("users")
    .update({
      plan: "free",
      subscription_status: "canceled",
      daily_outfit_limit: 3,
      ai_scan_limit: 10
    })
    .eq("subscription_id", stripeSubscriptionId);
}

async function findUserIdBySubscription(adminClient: AdminClient, stripeSubscriptionId: string | null) {
  if (!stripeSubscriptionId) {
    return null;
  }

  const { data } = await adminClient
    .from("users")
    .select("id")
    .eq("subscription_id", stripeSubscriptionId)
    .maybeSingle();

  return data?.id ?? null;
}

async function handleCheckoutCompleted(adminClient: AdminClient, event: StripeEvent) {
  const session = event.data.object;
  const userId = metadataUserId(session) ?? stringField(session, "client_reference_id");

  if (!userId) {
    throw new Error("Stripe checkout session is missing user metadata.");
  }

  await activateProPlan(adminClient, {
    userId,
    stripeCustomerId: stringField(session, "customer"),
    stripeSubscriptionId: stringField(session, "subscription"),
    checkoutSessionId: stringField(session, "id")
  });
}

async function handleInvoicePaymentSucceeded(adminClient: AdminClient, event: StripeEvent) {
  const invoice = event.data.object;
  const stripeSubscriptionId = stringField(invoice, "subscription");
  const userId = metadataUserId(invoice) ?? (await findUserIdBySubscription(adminClient, stripeSubscriptionId));

  if (!userId) {
    return;
  }

  await activateProPlan(adminClient, {
    userId,
    stripeCustomerId: stringField(invoice, "customer"),
    stripeSubscriptionId,
    checkoutSessionId: null
  });
}

export async function POST(request: NextRequest) {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return jsonError("Admin database client is not configured.", 503);
  }

  let event: StripeEvent;

  try {
    const rawBody = await request.text();
    event = verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"));
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : "Invalid Stripe webhook.", 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(adminClient, event);
    }

    if (event.type === "invoice.payment_succeeded") {
      await handleInvoicePaymentSucceeded(adminClient, event);
    }

    if (event.type === "invoice.payment_failed") {
      await markPaymentProblem(adminClient, stringField(event.data.object, "subscription"));
    }

    if (event.type === "customer.subscription.deleted") {
      await markSubscriptionCancelled(adminClient, stringField(event.data.object, "id"));
    }
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : "Could not process Stripe webhook.", 500);
  }

  return applySecurityHeaders(NextResponse.json({ received: true }));
}
