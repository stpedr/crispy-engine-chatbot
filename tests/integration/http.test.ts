import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../../src/config/env";
import { buildServer } from "../../src/infrastructure/http/server";
import { InMemoryCrmGateway } from "../../src/infrastructure/crm/InMemoryCrmGateway";
import { InMemoryEventBus } from "../../src/infrastructure/events/InMemoryEventBus";
import { nullLogger } from "../../src/infrastructure/logging/logger";
import { createMetrics } from "../../src/infrastructure/observability/metrics";
import { InMemoryLeadRepository } from "../../src/infrastructure/persistence/InMemoryLeadRepository";

describe("HTTP API", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("accepts a message and returns a bot reply", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {
        sessionId: "http-1",
        channel: "web",
        text: "Quero automatizar leads"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sessionId: "http-1",
      stage: "qualifying",
      handoff: false
    });
  });

  it("serves onboarding at the root route and the sales chat separately", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({ method: "GET", url: "/" });
    const chat = await app.inject({ method: "GET", url: "/chat" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Configurar Sales Bot");
    expect(response.body).toContain('id="setup-form"');
    expect(chat.statusCode).toBe(200);
    expect(chat.body).toContain('id="composer"');
  });

  it("exposes prometheus metrics", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    await app.inject({
      method: "GET",
      url: "/health"
    });

    const response = await app.inject({
      method: "GET",
      url: "/metrics"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("http_request_duration_seconds");
  });

  it("lists the product menu", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({ method: "GET", url: "/products" });

    expect(response.statusCode).toBe(200);
    expect(response.json().products).toHaveLength(3);
    expect(response.json().products[0]).toMatchObject({ id: "starter" });
  });

  it("activates a sales workspace and replaces the product menu", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const activation = await app.inject({
      method: "PUT",
      url: "/workspace",
      payload: {
        businessName: "Vitta Clinica",
        segment: "Saude e bem-estar",
        targetAudience: "Adultos que procuram acompanhamento preventivo",
        valueProposition: "Cuidado continuo com atendimento personalizado",
        brandColor: "#1769aa",
        salesEmail: "vendas@vitta.example",
        tone: "consultative",
        greeting: "Ola! Posso ajudar voce a encontrar o melhor acompanhamento?",
        handoffMessage: "Perfeito. Vou encaminhar seu contexto para nossa equipe comercial.",
        products: [{
          name: "Plano Essencial",
          description: "Acompanhamento mensal com orientacao preventiva.",
          priceCents: 29900,
          tags: ["saude", "mensal"]
        }]
      }
    });
    const workspace = await app.inject({ method: "GET", url: "/workspace" });
    const products = await app.inject({ method: "GET", url: "/products" });

    expect(activation.statusCode).toBe(200);
    expect(activation.json().workspace).toMatchObject({ businessName: "Vitta Clinica", status: "active" });
    expect(workspace.json().workspace.products).toHaveLength(1);
    expect(products.json().products).toEqual([
      expect.objectContaining({ id: "plano-essencial", name: "Plano Essencial", priceCents: 29900 })
    ]);

    const observedMetrics = await app.inject({ method: "GET", url: "/metrics" });
    expect(observedMetrics.body).toContain("workspace_activations_total");
  });

  it("rejects invalid payloads", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {
        sessionId: "",
        text: ""
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_request"
    });
  });

  it("normalizes webhooks, deduplicates messages and completes handoff", async () => {
    const metrics = createMetrics({ serviceName: "sales-bot-webhook-test", enabled: true });
    const events = new InMemoryEventBus(nullLogger, metrics);
    const leads = new InMemoryLeadRepository();
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000",
        WEBHOOK_INGRESS_TOKEN: "test-token",
        HANDOFF_RETRY_DELAY_MS: "0"
      }),
      logger: nullLogger,
      metrics,
      events,
      leads,
      crm: new InMemoryCrmGateway()
    });

    const payload = {
      messageId: "wamid-1",
      senderId: "5511999999999",
      text: "Sou Ana, preciso de automacao de vendas agora. Meu email e ana@example.com, tenho orcamento R$ 5000 e autorizo contato."
    };
    const first = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: { "x-webhook-token": "test-token" },
      payload
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: { "x-webhook-token": "test-token" },
      payload
    });
    await events.drain();

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ status: "processed", reply: { stage: "handoff" } });
    expect(duplicate.json()).toEqual({ status: "duplicate", messageId: "wamid-1" });

    const leadList = await app.inject({ method: "GET", url: "/leads?handoffStatus=completed" });
    expect(leadList.json()).toMatchObject({ total: 1 });
    expect(leadList.json().leads[0]).toMatchObject({
      channel: "whatsapp",
      handoffStatus: "completed",
      crmProvider: "local-crm"
    });

    const observedMetrics = await app.inject({ method: "GET", url: "/metrics" });
    expect(observedMetrics.body).toContain("lead_events_total");
    expect(observedMetrics.body).toContain("lead_handoffs_total");
    expect(observedMetrics.body).toContain("event_queue_depth");
  });

  it("protects webhook ingestion and supports provider verification", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000",
        WEBHOOK_VERIFY_TOKEN: "verify-secret",
        WEBHOOK_INGRESS_TOKEN: "ingress-secret"
      }),
      logger: nullLogger
    });

    const verification = await app.inject({
      method: "GET",
      url: "/webhooks/instagram?hub.mode=subscribe&hub.verify_token=verify-secret&hub.challenge=challenge-123"
    });
    const unauthorized = await app.inject({
      method: "POST",
      url: "/webhooks/instagram",
      payload: { messageId: "ig-1", senderId: "person-1", text: "Quero vender mais" }
    });

    expect(verification.statusCode).toBe(200);
    expect(verification.body).toBe("challenge-123");
    expect(unauthorized.statusCode).toBe(401);
  });
});
