import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  APP_BASE_URL: z.string().url(),
  EMAIL_PROVIDER: z.enum(["postmark", "sendgrid", "resend", "noop"]).default("postmark"),
  POSTMARK_API_TOKEN: z.string().optional(),
  POSTMARK_SENDER_EMAIL: z.string().min(3).optional(),
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().min(3).optional(),
  REDIS_URL: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  TURNSTILE_SITE_KEY: z.string().optional(),
  MFA_ENCRYPTION_KEY: z.string().min(16).optional(),
  DIGEST_TIMEZONE: z.string().default("America/New_York"),
  DIGEST_MIN_THRESHOLD: z.coerce.number().int().positive().default(4),
  DIGEST_MAX_AGE_DAYS: z.coerce.number().int().positive().default(180)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
