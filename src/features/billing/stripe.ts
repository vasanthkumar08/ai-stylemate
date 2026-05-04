import { createHmac, timingSafeEqual } from "node:crypto";
import { env, requireFeatureEnv } from "@/config/env";

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: StripeObject;
  };
};

type StripeObject = Record<string, unknown>;

function assertStripeConfigured() {
  requireFeatureEnv("stripe", ["STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID"]);
}

function append(params: URLSearchParams, key: string, value: string | number | boolean | null | undefined) {
  if (value !== undefined && value !== null && value !== "") {
    params.append(key, String(value));
  }
}

export async function createProCheckoutSession({
  userId,
  email,
  stripeCustomerId
}: {
  userId: string;
  email: string;
  stripeCustomerId?: string | null;
}) {
  assertStripeConfigured();

  const params = new URLSearchParams();
  append(params, "mode", "subscription");
  append(params, "line_items[0][price]", env.STRIPE_PRO_PRICE_ID);
  append(params, "line_items[0][quantity]", 1);
  append(params, "success_url", `${env.NEXT_PUBLIC_APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`);
  append(params, "cancel_url", `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=cancelled`);
  append(params, "client_reference_id", userId);
  append(params, "metadata[userId]", userId);
  append(params, "subscription_data[metadata][userId]", userId);
  append(params, "allow_promotion_codes", true);

  if (stripeCustomerId) {
    append(params, "customer", stripeCustomerId);
  } else {
    append(params, "customer_email", email);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  const data = (await response.json().catch(() => ({}))) as StripeCheckoutSession & {
    error?: { message?: string };
  };

  if (!response.ok || !data.url) {
    throw new Error(data.error?.message ?? "Could not create Stripe checkout session.");
  }

  return data;
}

function getSignatureParts(signature: string) {
  return signature.split(",").reduce(
    (parts, item) => {
      const [key, value] = item.split("=");
      if (key === "t" && value) parts.timestamp = value;
      if (key === "v1" && value) parts.signatures.push(value);
      return parts;
    },
    { timestamp: "", signatures: [] as string[] }
  );
}

export function verifyStripeWebhook(rawBody: string, signature: string | null) {
  requireFeatureEnv("stripe", ["STRIPE_WEBHOOK_SECRET"]);

  if (!signature) {
    throw new Error("Missing Stripe signature.");
  }

  const { timestamp, signatures } = getSignatureParts(signature);

  if (!timestamp || !signatures.length) {
    throw new Error("Invalid Stripe signature header.");
  }

  const timestampSeconds = Number(timestamp);
  const toleranceSeconds = 5 * 60;

  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > toleranceSeconds) {
    throw new Error("Stripe webhook timestamp is outside tolerance.");
  }

  const expected = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const matches = signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });

  if (!matches) {
    throw new Error("Invalid Stripe webhook signature.");
  }

  return JSON.parse(rawBody) as StripeEvent;
}

export function stringField(object: StripeObject, key: string) {
  const value = object[key];
  return typeof value === "string" ? value : null;
}

export function metadataUserId(object: StripeObject) {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? stringField(metadata as StripeObject, "userId")
    : null;
}
