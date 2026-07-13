import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { HandoffWorker } from "../../application/HandoffWorker";
import { SalesBot } from "../../application/SalesBot";
import { TemplateSalesCopyGenerator } from "../../application/TemplateSalesCopyGenerator";
import type { AppConfig } from "../../config/env";
import { CHANNELS } from "../../domain/types";
import type {
  AppLogger,
  ConversationRepository,
  CrmGateway,
  EventBus,
  IdempotencyStore,
  LeadRepository,
  ProductCatalog,
  SalesCopyGenerator
} from "../../domain/ports";
import { InMemoryProductCatalog } from "../catalog/InMemoryCatalog";
import { FallbackSalesCopyGenerator, HttpSalesCopyGenerator } from "../copy/HttpSalesCopyGenerator";
import { OllamaSalesCopyGenerator } from "../copy/OllamaSalesCopyGenerator";
import { SalesTopicGuardGenerator } from "../copy/SalesTopicGuardGenerator";
import { HttpCrmGateway } from "../crm/HttpCrmGateway";
import { InMemoryCrmGateway } from "../crm/InMemoryCrmGateway";
import { InMemoryEventBus } from "../events/InMemoryEventBus";
import { InMemoryIdempotencyStore } from "../idempotency/InMemoryIdempotencyStore";
import { createLogger } from "../logging/logger";
import { createMetrics, type AppMetrics } from "../observability/metrics";
import { InMemoryConversationRepository } from "../persistence/InMemoryConversationRepository";
import { InMemoryLeadRepository } from "../persistence/InMemoryLeadRepository";
import { chatPage } from "./chatPage";
import { pwaIcon, pwaManifest, serviceWorker } from "./pwaAssets";

export interface ServerDependencies {
  config: AppConfig;
  logger?: AppLogger;
  metrics?: AppMetrics;
  conversations?: ConversationRepository;
  leads?: LeadRepository;
  catalog?: ProductCatalog;
  events?: EventBus;
  crm?: CrmGateway;
  copyGenerator?: SalesCopyGenerator;
  idempotency?: IdempotencyStore;
}

const customerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().min(1).optional(),
  budget: z.number().positive().optional(),
  pain: z.string().min(1).optional(),
  timeline: z.enum(["now", "this_month", "this_quarter", "later"]).optional(),
  consentToContact: z.boolean().optional()
});

const messageSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1).max(4000),
  channel: z.enum(CHANNELS).default("web"),
  customer: customerSchema.optional()
});

const webhookParamsSchema = z.object({
  channel: z.enum(["whatsapp", "instagram"])
});

const webhookMessageSchema = z.object({
  messageId: z.string().min(1),
  senderId: z.string().min(1),
  text: z.string().min(1).max(4000),
  customer: customerSchema.optional()
});

const leadListQuerySchema = z.object({
  stage: z.enum(["new", "qualifying", "qualified", "proposal", "handoff"]).optional(),
  handoffStatus: z.enum(["not_requested", "queued", "processing", "completed", "failed"]).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50)
});

export async function buildServer(deps: ServerDependencies): Promise<FastifyInstance> {
  const logger =
    deps.logger ??
    createLogger({
      level: deps.config.logLevel,
      pretty: deps.config.logPretty,
      serviceName: deps.config.serviceName
    });
  const metrics =
    deps.metrics ??
    createMetrics({
      serviceName: deps.config.serviceName,
      enabled: deps.config.metricsEnabled
    });
  const conversations = deps.conversations ?? new InMemoryConversationRepository();
  const leads = deps.leads ?? new InMemoryLeadRepository();
  const catalog = deps.catalog ?? new InMemoryProductCatalog();
  const events = deps.events ?? new InMemoryEventBus(logger.child({ component: "event-bus" }), metrics);
  const crm = deps.crm ?? (deps.config.crmWebhookUrl
    ? new HttpCrmGateway({
        url: deps.config.crmWebhookUrl,
        token: deps.config.crmToken,
        timeoutMs: deps.config.outboundTimeoutMs
      })
    : new InMemoryCrmGateway());
  const templateCopyGenerator = new TemplateSalesCopyGenerator();
  let copyGenerator: SalesCopyGenerator;
  let copyGeneratorMode: string;
  if (deps.copyGenerator) {
    copyGenerator = deps.copyGenerator;
    copyGeneratorMode = "custom";
  } else if (deps.config.ollamaEnabled) {
    copyGenerator = new FallbackSalesCopyGenerator(
      new SalesTopicGuardGenerator(
        new OllamaSalesCopyGenerator(
          {
            baseUrl: deps.config.ollamaBaseUrl,
            model: deps.config.ollamaModel,
            temperature: deps.config.ollamaTemperature,
            timeoutMs: deps.config.ollamaTimeoutMs,
            maxHistory: deps.config.ollamaMaxHistory,
            keepAlive: deps.config.ollamaKeepAlive
          },
          logger.child({ component: "ollama-copy-generator" }),
          metrics
        ),
        templateCopyGenerator,
        logger.child({ component: "sales-topic-guard" }),
        metrics
      ),
      templateCopyGenerator,
      logger.child({ component: "copy-generator" })
    );
    copyGeneratorMode = `ollama:${deps.config.ollamaModel}`;
  } else if (deps.config.copyGeneratorUrl) {
    copyGenerator = new FallbackSalesCopyGenerator(
        new HttpSalesCopyGenerator({
          url: deps.config.copyGeneratorUrl,
          token: deps.config.copyGeneratorToken,
          timeoutMs: deps.config.outboundTimeoutMs
        }),
        templateCopyGenerator,
        logger.child({ component: "copy-generator" })
      );
    copyGeneratorMode = "http";
  } else {
    copyGenerator = templateCopyGenerator;
    copyGeneratorMode = "template";
  }
  const idempotency = deps.idempotency ?? new InMemoryIdempotencyStore();
  const worker = new HandoffWorker({
    events,
    leads,
    crm,
    logger: logger.child({ component: "handoff-worker" }),
    metrics,
    maxAttempts: deps.config.handoffMaxAttempts,
    retryDelayMs: deps.config.handoffRetryDelayMs
  });
  worker.start();
  const bot = new SalesBot({
    conversations,
    leads,
    catalog,
    events,
    copyGenerator,
    logger: logger.child({ component: "sales-bot" }),
    metrics
  });

  const app = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID()
  });
  const requestStart = new WeakMap<FastifyRequest, bigint>();

  await app.register(cors, { origin: true });

  app.addHook("onClose", async () => {
    await events.drain();
    worker.stop();
    await events.stop();
  });

  app.addHook("onRequest", (request, _reply, done) => {
    requestStart.set(request, process.hrtime.bigint());
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url
      },
      "http request started"
    );
    done();
  });

  app.addHook("onResponse", (request, reply, done) => {
    const startedAt = requestStart.get(request) ?? process.hrtime.bigint();
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const route = request.routeOptions.url ?? request.url.split("?")[0] ?? "unknown";

    metrics.recordHttpRequest({
      method: request.method,
      route,
      statusCode: reply.statusCode,
      durationSeconds
    });
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        route,
        statusCode: reply.statusCode,
        durationMs: Math.round(durationSeconds * 1000)
      },
      "http request completed"
    );
    done();
  });

  app.setErrorHandler((error, request, reply) => {
    const serializedError = serializeError(error);

    logger.error(
      {
        requestId: request.id,
        error: serializedError
      },
      "unhandled request error"
    );

    reply.status(500).send({
      error: "internal_error",
      message: "Nao foi possivel processar a solicitacao."
    });
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async () => ({
    status: "ready",
    queue: "ready",
    worker: "ready",
    copyGenerator: copyGeneratorMode
  }));
  app.get("/ai/status", async () => ({
    provider: copyGeneratorMode,
    fallback: "template",
    guardrails: ["system_prompt", "structured_output", "local_validation", "deterministic_business_rules"]
  }));
  app.get("/", async (_request, reply) => reply.type("text/html; charset=utf-8").send(chatPage));
  app.get("/manifest.webmanifest", async (_request, reply) =>
    reply.type("application/manifest+json").send(pwaManifest)
  );
  app.get("/icon.svg", async (_request, reply) => reply.type("image/svg+xml").send(pwaIcon));
  app.get("/sw.js", async (_request, reply) =>
    reply.header("service-worker-allowed", "/").type("application/javascript").send(serviceWorker)
  );

  app.get("/metrics", async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header("content-type", metrics.contentType);
    return metrics.metrics();
  });

  app.get("/products", async () => ({ products: await catalog.list() }));

  app.get("/leads", async (request, reply) => {
    const parsed = leadListQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });

    const allLeads = await leads.list();
    const filtered = allLeads
      .filter((lead) => !parsed.data.stage || lead.stage === parsed.data.stage)
      .filter((lead) => !parsed.data.handoffStatus || lead.handoffStatus === parsed.data.handoffStatus)
      .slice(0, parsed.data.limit);
    return { leads: filtered, total: filtered.length };
  });

  app.get("/leads/:leadId", async (request, reply) => {
    const params = z.object({ leadId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "invalid_request" });
    const lead = await leads.findById(params.data.leadId);
    if (!lead) return reply.status(404).send({ error: "not_found" });
    return lead;
  });

  app.post("/messages", async (request, reply) => {
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        details: parsed.error.flatten()
      });
    }

    return bot.handleMessage({
      ...parsed.data,
      correlationId: request.id
    });
  });

  app.get("/webhooks/:channel", async (request, reply) => {
    const params = webhookParamsSchema.safeParse(request.params);
    const query = z.object({
      "hub.mode": z.literal("subscribe"),
      "hub.verify_token": z.string(),
      "hub.challenge": z.string()
    }).safeParse(request.query);
    if (!params.success || !query.success || !deps.config.webhookVerifyToken) {
      return reply.status(403).send({ error: "verification_failed" });
    }
    if (query.data["hub.verify_token"] !== deps.config.webhookVerifyToken) {
      return reply.status(403).send({ error: "verification_failed" });
    }
    return reply.type("text/plain").send(query.data["hub.challenge"]);
  });

  app.post("/webhooks/:channel", async (request, reply) => {
    const params = webhookParamsSchema.safeParse(request.params);
    const message = webhookMessageSchema.safeParse(request.body);
    if (!params.success || !message.success) {
      return reply.status(400).send({ error: "invalid_request" });
    }
    if (deps.config.webhookIngressToken && request.headers["x-webhook-token"] !== deps.config.webhookIngressToken) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const idempotencyKey = `${params.data.channel}:${message.data.messageId}`;
    if (!await idempotency.claim(idempotencyKey)) {
      return { status: "duplicate", messageId: message.data.messageId };
    }

    const botReply = await bot.handleMessage({
      sessionId: `${params.data.channel}:${message.data.senderId}`,
      channel: params.data.channel,
      text: message.data.text,
      customer: message.data.customer,
      correlationId: request.id
    });
    return { status: "processed", messageId: message.data.messageId, reply: botReply };
  });

  app.get("/conversations/:sessionId", async (request, reply) => {
    const params = z.object({ sessionId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "invalid_request" });
    }

    const conversation = await conversations.findBySessionId(params.data.sessionId);
    if (!conversation) return reply.status(404).send({ error: "not_found" });

    return conversation;
  });

  return app;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    name: "UnknownError",
    message: String(error)
  };
}
