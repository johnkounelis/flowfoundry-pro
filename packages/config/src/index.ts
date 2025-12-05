import { z } from "zod";

export const Roles = ["OWNER", "ADMIN", "BUILDER", "VIEWER"] as const;
export type Role = (typeof Roles)[number];

export const Plans = ["FREE", "PRO", "BUSINESS"] as const;
export type Plan = (typeof Plans)[number];

export const PlanLimits: Record<Plan, { runs: number; flows: number; members: number }> = {
  FREE: { runs: 100, flows: 2, members: 2 },
  PRO: { runs: 5000, flows: 20, members: 10 },
  BUSINESS: { runs: 50000, flows: 9999, members: 9999 }
};

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().default("changeme-nextauth"),
  EMAIL_SERVER_HOST: z.string().default("mailhog"),
  EMAIL_SERVER_PORT: z.string().default("1025"),
  EMAIL_FROM: z.string().default("FlowFoundry Pro <no-reply@flowfoundry.local>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/flowfoundry"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  STRIPE_PUBLIC_KEY: z.string().default("pk_test_xxx"),
  STRIPE_SECRET_KEY: z.string().default("sk_test_xxx"),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().default("price_pro_test"),
  STRIPE_PRICE_BUSINESS: z.string().default("price_business_test"),
  STRIPE_METER_ID: z.string().default("runs_meter_test"),
  STRIPE_MOCK: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().default("dev"),
  INNGEST_SIGNING_KEY: z.string().default("dev"),
  OPENAI_API_KEY: z.string().optional(),
  AI_DEFAULT_MODEL: z.string().default("gpt-4o-mini"),
  AI_MAX_TOKENS: z.coerce.number().default(4096),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://localhost:4318"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().default("development"),
  UNLEASH_URL: z.string().default("http://localhost:4242/api"),
  UNLEASH_CLIENT_KEY: z.string().default("dev.public.123"),
  NEXT_PUBLIC_UNLEASH_ENV: z.string().default("development"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default("en-US")
});

export type Env = z.infer<typeof EnvSchema>;
export const readEnv = (): Env => EnvSchema.parse(process.env);

export const FeatureFlags = {
  NewBuilder: "new-builder",
  AIExtractorV2: "ai-extractor-v2",
  BetaCollab: "beta-collab"
} as const;
