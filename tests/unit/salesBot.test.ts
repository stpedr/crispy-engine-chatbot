import { describe, expect, it } from "vitest";
import { SalesBot, extractProfile } from "../../src/application/SalesBot";
import type { AppLogger } from "../../src/domain/ports";
import { InMemoryProductCatalog } from "../../src/infrastructure/catalog/InMemoryCatalog";
import { nullLogger } from "../../src/infrastructure/logging/logger";
import { InMemoryConversationRepository } from "../../src/infrastructure/persistence/InMemoryConversationRepository";

const noopMetrics = {
  recordBotMessage: () => undefined
};

describe("SalesBot", () => {
  it("asks for missing qualification fields", async () => {
    const bot = new SalesBot({
      conversations: new InMemoryConversationRepository(),
      catalog: new InMemoryProductCatalog(),
      logger: nullLogger,
      metrics: noopMetrics
    });

    const reply = await bot.handleMessage({
      sessionId: "s-1",
      channel: "web",
      text: "Quero vender mais pelo WhatsApp"
    });

    expect(reply.stage).toBe("qualifying");
    expect(reply.text).toContain("email");
  });

  it("qualifies and hands off a complete lead", async () => {
    const conversations = new InMemoryConversationRepository();
    const bot = new SalesBot({
      conversations,
      catalog: new InMemoryProductCatalog(),
      logger: nullLogger,
      metrics: noopMetrics
    });

    const reply = await bot.handleMessage({
      sessionId: "s-2",
      channel: "whatsapp",
      text: "Sou Ana, preciso de automacao de vendas e CRM agora. Meu email e ana@example.com, tenho orcamento R$ 5000 e autorizo contato."
    });

    expect(reply.stage).toBe("handoff");
    expect(reply.handoff).toBe(true);
    expect(reply.recommendedProducts.length).toBeGreaterThan(0);

    const conversation = await conversations.findBySessionId("s-2");
    expect(conversation?.messages).toHaveLength(2);
  });

  it("extracts Portuguese names with accents", () => {
    expect(extractProfile("Sou Jos\u00e9 da Silva, preciso automatizar vendas").name).toBe("Jos\u00e9 da Silva");
  });

  it("correlates business logs with the HTTP request", async () => {
    const entries: Array<Record<string, unknown>> = [];
    const logger: AppLogger = {
      info: (data) => entries.push(data),
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
      child: () => logger
    };
    const bot = new SalesBot({
      conversations: new InMemoryConversationRepository(),
      catalog: new InMemoryProductCatalog(),
      logger,
      metrics: noopMetrics
    });

    await bot.handleMessage({
      sessionId: "s-correlated",
      channel: "web",
      text: "Quero automatizar vendas",
      correlationId: "request-123"
    });

    expect(entries).toContainEqual(expect.objectContaining({
      requestId: "request-123",
      sessionId: "s-correlated"
    }));
  });
});
