import "server-only";

import { z } from "zod";

type EnvFeature = "auth" | "cloudinary" | "openai" | "stripe" | "monitoring" | "cron";

export class EnvConfigurationError extends Error {
  constructor(
    public readonly feature: EnvFeature,
    public readonly missingKeys: readonly string[],
    message: string
  ) {
    super(message);
    this.name = "EnvConfigurationError";
  }
}

function fallbackAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function isPlaceholderEnvValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "" ||
    normalized.startsWith("your_") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_me") ||
    normalized.includes("your-project") ||
    normalized.includes("your-vercel-domain")
  );
}

const optionalString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().optional().default("").catch("")
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional().catch(undefined)
);

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().catch(fallbackAppUrl()),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default("").catch(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).default("stylemate-ai").catch("stylemate-ai"),
  OPENAI_API_KEY: optionalString,
  OPENAI_VISION_MODEL: z.string().min(1).default("gpt-5-mini").catch("gpt-5-mini"),
  AI_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().positive().default(18000).catch(18000),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRO_PRICE_ID: optionalString,
  ADMIN_EMAIL_WHITELIST: optionalString,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString,
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.coerce.boolean().default(false).catch(false),
  MONITORING_WEBHOOK_URL: optionalUrl,
  CRON_SECRET: optionalString
});

const testEnv =
  process.env.npm_lifecycle_event === "test"
    ? {
        NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-supabase-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "test-supabase-service-role-key",
        CLOUDINARY_CLOUD_NAME: "test-cloudinary-cloud",
        CLOUDINARY_API_KEY: "test-cloudinary-api-key",
        CLOUDINARY_API_SECRET: "test-cloudinary-api-secret",
        OPENAI_API_KEY: "test-openai-api-key",
        OPENAI_VISION_MODEL: "gpt-5-mini",
        ...process.env
      }
    : process.env;

export const env = envSchema.parse(testEnv);
export type AppEnv = typeof env;
export type EnvKey = keyof AppEnv;

const featureMessages: Record<EnvFeature, string> = {
  auth: "Authentication temporarily unavailable.",
  cloudinary: "Cloudinary upload unavailable.",
  openai: "AI scan unavailable.",
  stripe: "Billing temporarily unavailable.",
  monitoring: "Monitoring unavailable.",
  cron: "Scheduled task unavailable."
};

export function getOptionalEnv<Key extends EnvKey>(key: Key): AppEnv[Key] | undefined {
  const value = env[key];

  if (typeof value === "string" && isPlaceholderEnvValue(value)) {
    return undefined;
  }

  return value || undefined;
}

export function getRequiredEnv<Key extends EnvKey>(key: Key, feature: EnvFeature): NonNullable<AppEnv[Key]> {
  const value = getOptionalEnv(key);

  if (value === undefined) {
    logEnvIssue(feature, [key]);
    throw new EnvConfigurationError(feature, [key], featureMessages[feature]);
  }

  return value as NonNullable<AppEnv[Key]>;
}

function collectMissing(keys: readonly EnvKey[]) {
  return keys.filter((key) => getOptionalEnv(key) === undefined);
}

export function requireFeatureEnv(feature: EnvFeature, keys: readonly EnvKey[]) {
  const missingKeys = collectMissing(keys);

  if (missingKeys.length) {
    logEnvIssue(feature, missingKeys);
    throw new EnvConfigurationError(feature, missingKeys, featureMessages[feature]);
  }
}

export function isFeatureEnvConfigured(keys: readonly EnvKey[]) {
  return collectMissing(keys).length === 0;
}

export function isSupabaseAuthConfigured() {
  return isFeatureEnvConfigured(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
}

export function isSupabaseAdminConfigured() {
  return isFeatureEnvConfigured(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
}

export function isCloudinaryConfigured() {
  return isFeatureEnvConfigured(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);
}

export function isOpenAiConfigured() {
  return isFeatureEnvConfigured(["OPENAI_API_KEY"]);
}

export function isStripeCheckoutConfigured() {
  return isFeatureEnvConfigured(["STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID"]);
}

export function isStripeWebhookConfigured() {
  return isFeatureEnvConfigured(["STRIPE_WEBHOOK_SECRET"]);
}

export function logEnvIssue(feature: EnvFeature, keys: readonly EnvKey[]) {
  console.error("[stylemate-env]", {
    feature,
    missingKeys: keys,
    message: featureMessages[feature]
  });
}
