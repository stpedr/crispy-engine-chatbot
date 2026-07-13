import { describe, expect, it } from "vitest";
import { SalesBot, extractProfile } from "../../src/application/SalesBot";
import { TemplateSalesCopyGenerator } from "../../src/application/TemplateSalesCopyGenerator";
import type { AppLogger } from "../../src/domain/ports";
import type { DomainEvent } from "../../src/domain/types";
import { InMemoryProductCatalog } from "../../src/infrastructure/catalog/InMemoryCatalog";
import { nullLogger } from "../../src/infrastructure/logging/logger";
import { InMemoryConversationRepository } from "../../src/infrastructure/persistence/InMemoryConversationRepository";
import { InMemoryLeadRepository } from "../../src/infrastructure/persistence/InMemoryLeadRepository";
import { InMemorySalesWorkspaceRepository } from "../../src/infrastructure/persistence/InMemorySalesWorkspaceRepository";

const noopMetrics = {
  recordBotMessage: () => undefined
};

function createBot(input?: {
  conversations?: InMemoryConversationRepository;
  leads?: InMemoryLeadRepository;
  logger?: AppLogger;
  events?: DomainEvent[];
}) {
  const events = input?.events ?? [];
  return new SalesBot({
    conversations: input?.conversations ?? new InMemoryConversationRepository(),
    leads: input?.leads ?? new InMemoryLeadRepository(),
    catalog: new InMemoryProductCatalog(),
    events: { publish: async (event) => { events.push(event); } },
    copyGenerator: new TemplateSalesCopyGenerator(),
    workspace: new InMemorySalesWorkspaceRepository(),
    logger: input?.logger ?? nullLogger,
    metrics: noopMetrics
  });
}

describe("SalesBot", () => {
  it("asks for missing qualification fields", async () => {
    const bot = createBot();

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
    const leads = new InMemoryLeadRepository();
    const events: DomainEvent[] = [];
    const bot = createBot({ conversations, leads, events });

    const reply = await bot.handleMessage({
      sessionId: "s-2",
      channel: "whatsapp",
      text: "Sou Ana, preciso de automacao de vendas e CRM agora. Meu email e ana@example.com, tenho orcamento R$ 5000 e autorizo contato."
    });

    expect(reply.stage).toBe("handoff");
    expect(reply.handoff).toBe(true);
    expect(reply.recommendedProducts.length).toBeGreaterThan(0);
    expect(reply.profile).toMatchObject({ email: "ana@example.com", budget: 5000, consentToContact: true });

    const conversation = await conversations.findBySessionId("s-2");
    expect(conversation?.messages).toHaveLength(2);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "lead.handoff.requested" });
    expect((await leads.findBySessionId("s-2"))?.handoffStatus).toBe("queued");
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
    const bot = createBot({ logger });

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
