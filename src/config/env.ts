import { z } from "zod";

function fallbackAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional().catch(undefined)
);

const optionalString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().optional().default("")
);

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().catch(fallbackAppUrl()),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default("").catch(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("stylemate-ai"),
  OPENAI_API_KEY: optionalString,
  OPENAI_VISION_MODEL: z.string().min(1).default("gpt-5-mini"),
  AI_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().positive().default(18000).catch(18000),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  ADMIN_EMAIL_WHITELIST: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.coerce.boolean().default(false),
  MONITORING_WEBHOOK_URL: optionalUrl,
  CRON_SECRET: z.string().optional()
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

const parsedEnv = envSchema.safeParse(testEnv);

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      NEXT_PUBLIC_APP_URL: fallbackAppUrl(),
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      CLOUDINARY_UPLOAD_FOLDER: "stylemate-ai",
      OPENAI_API_KEY: "",
      OPENAI_VISION_MODEL: "gpt-5-mini",
      AI_RECOMMENDATION_TIMEOUT_MS: 18000,
      NEXT_PUBLIC_ANALYTICS_ENABLED: false
    };
