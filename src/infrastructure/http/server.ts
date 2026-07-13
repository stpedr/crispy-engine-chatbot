import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { SalesBot } from "../../application/SalesBot";
import type { AppConfig } from "../../config/env";
import { CHANNELS } from "../../domain/types";
import type { AppLogger, ConversationRepository, ProductCatalog } from "../../domain/ports";
import { InMemoryProductCatalog } from "../catalog/InMemoryCatalog";
import { createLogger } from "../logging/logger";
import { createMetrics, type AppMetrics } from "../observability/metrics";
import { InMemoryConversationRepository } from "../persistence/InMemoryConversationRepository";
import { chatPage } from "./chatPage";
import { pwaIcon, pwaManifest, serviceWorker } from "./pwaAssets";

export interface ServerDependencies {
  config: AppConfig;
  logger?: AppLogger;
  metrics?: AppMetrics;
  conversations?: ConversationRepository;
  catalog?: ProductCatalog;
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
  const catalog = deps.catalog ?? new InMemoryProductCatalog();
  const bot = new SalesBot({ conversations, catalog, logger: logger.child({ component: "sales-bot" }), metrics });

  const app = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID()
  });
  const requestStart = new WeakMap<FastifyRequest, bigint>();

  await app.register(cors, { origin: true });

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
  app.get("/ready", async () => ({ status: "ready" }));
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
