import { z } from "zod";

const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  return value;
}, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("Incident Communication Hub <incident-hub@example.local>"),
  XURRENT_WEBHOOK_SECRET: z.string().optional().default(""),
  XURRENT_API_BASE_URL: z.string().optional().default(""),
  XURRENT_ACCOUNT_ID: z.string().optional().default(""),
  XURRENT_API_TOKEN: z.string().optional().default(""),
  DATADOG_WEBHOOK_SECRET: z.string().optional().default(""),
  DATADOG_SITE: z.string().optional().default("datadoghq.com"),
  DATADOG_API_KEY: z.string().optional().default(""),
  DEV_EMAIL_MODE: envBoolean.default(true),
  SESSION_SECRET: z.string().default("local-session-secret"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().default("admin")
});

export const env = envSchema.parse(process.env);
