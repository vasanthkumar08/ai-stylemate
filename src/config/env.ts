import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
);

const requiredString = (name: string) =>
  z
    .string({
      error: `${name} is required.`
    })
    .trim()
    .min(1, `${name} is required.`)
    .refine(
      (value) => !/^your[_-]/i.test(value) && !/placeholder|replace_me/i.test(value),
      `${name} must not use a placeholder value.`
    );

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  CLOUDINARY_CLOUD_NAME: requiredString("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: requiredString("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requiredString("CLOUDINARY_API_SECRET"),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("stylemate-ai"),
  OPENAI_API_KEY: requiredString("OPENAI_API_KEY"),
  OPENAI_VISION_MODEL: requiredString("OPENAI_VISION_MODEL").default("gpt-5-mini"),
  AI_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().positive().default(18000),
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
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
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

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
