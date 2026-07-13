import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SERVICE_NAME: z.string().min(1).default("sales-bot"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOG_PRETTY: booleanFromEnv.default(false),
  METRICS_ENABLED: booleanFromEnv.default(true),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional().or(z.literal("")),
  DATA_FILE: z.string().min(1).default(".data/sales-bot.json"),
  CRM_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  CRM_TOKEN: z.string().optional(),
  COPY_GENERATOR_URL: z.string().url().optional().or(z.literal("")),
  COPY_GENERATOR_TOKEN: z.string().optional(),
  WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WEBHOOK_INGRESS_TOKEN: z.string().optional(),
  HANDOFF_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  HANDOFF_RETRY_DELAY_MS: z.coerce.number().int().nonnegative().default(100),
  OUTBOUND_TIMEOUT_MS: z.coerce.number().int().positive().default(5000)
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    serviceName: parsed.SERVICE_NAME,
    logLevel: parsed.LOG_LEVEL,
    logPretty: parsed.LOG_PRETTY,
    metricsEnabled: parsed.METRICS_ENABLED,
    otelExporterOtlpEndpoint: parsed.OTEL_EXPORTER_OTLP_ENDPOINT || undefined,
    dataFile: parsed.DATA_FILE,
    crmWebhookUrl: parsed.CRM_WEBHOOK_URL || undefined,
    crmToken: parsed.CRM_TOKEN || undefined,
    copyGeneratorUrl: parsed.COPY_GENERATOR_URL || undefined,
    copyGeneratorToken: parsed.COPY_GENERATOR_TOKEN || undefined,
    webhookVerifyToken: parsed.WEBHOOK_VERIFY_TOKEN || undefined,
    webhookIngressToken: parsed.WEBHOOK_INGRESS_TOKEN || undefined,
    handoffMaxAttempts: parsed.HANDOFF_MAX_ATTEMPTS,
    handoffRetryDelayMs: parsed.HANDOFF_RETRY_DELAY_MS,
    outboundTimeoutMs: parsed.OUTBOUND_TIMEOUT_MS
  };
}
