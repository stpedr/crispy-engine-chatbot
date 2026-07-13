import { randomUUID } from "crypto";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { decideLeadStage, missingQualificationFields, scoreLead } from "../domain/leadScoring";
import type { AppLogger, BotMetrics, ConversationRepository, ProductCatalog } from "../domain/ports";
import type { BotInput, BotReply, Conversation, CustomerProfile, Product, Timeline } from "../domain/types";

export interface SalesBotDependencies {
  conversations: ConversationRepository;
  catalog: ProductCatalog;
  logger: AppLogger;
  metrics: BotMetrics;
}

const tracer = trace.getTracer("sales-bot");

export class SalesBot {
  constructor(private readonly deps: SalesBotDependencies) {}

  async handleMessage(input: BotInput): Promise<BotReply> {
    return tracer.startActiveSpan("sales_bot.handle_message", async (span) => {
      span.setAttributes({
        "sales.session_id": input.sessionId,
        "sales.channel": input.channel
      });
      if (input.correlationId) span.setAttribute("sales.correlation_id", input.correlationId);

      try {
        const reply = await this.handleMessageInternal(input);
        span.setAttributes({
          "sales.stage": reply.stage,
          "sales.score": reply.score,
          "sales.handoff": reply.handoff
        });

        const spanContext = span.spanContext();
        return {
          ...reply,
          traceId: spanContext.traceId === "00000000000000000000000000000000" ? undefined : spanContext.traceId
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async handleMessageInternal(input: BotInput): Promise<BotReply> {
    const now = new Date().toISOString();
    const conversation = await this.loadConversation(input.sessionId, now);
    const extractedProfile = extractProfile(input.text);

    conversation.profile = mergeProfiles(conversation.profile, input.customer, extractedProfile);
    conversation.messages.push({
      id: randomUUID(),
      role: "customer",
      text: input.text,
      at: now,
      channel: input.channel
    });

    const recommendedProducts = await this.deps.catalog.search(input.text, conversation.profile);
    conversation.score = scoreLead(conversation.profile);
    conversation.stage = decideLeadStage({
      score: conversation.score,
      profile: conversation.profile,
      recommendedProducts
    });
    conversation.lastProductIds = recommendedProducts.map((product) => product.id);

    const responseText = composeResponse(conversation, recommendedProducts);
    const handoff = conversation.stage === "handoff";

    conversation.messages.push({
      id: randomUUID(),
      role: "bot",
      text: responseText,
      at: new Date().toISOString()
    });
    conversation.updatedAt = new Date().toISOString();

    await this.deps.conversations.save(conversation);
    this.deps.metrics.recordBotMessage({
      stage: conversation.stage,
      channel: input.channel,
      handoff
    });

    this.deps.logger.info(
      {
        requestId: input.correlationId,
        sessionId: input.sessionId,
        channel: input.channel,
        stage: conversation.stage,
        score: conversation.score,
        handoff,
        recommendedProductIds: conversation.lastProductIds
      },
      "sales bot message handled"
    );

    return {
      sessionId: input.sessionId,
      text: responseText,
      stage: conversation.stage,
      score: conversation.score,
      recommendedProducts,
      handoff
    };
  }

  private async loadConversation(sessionId: string, now: string): Promise<Conversation> {
    const existing = await this.deps.conversations.findBySessionId(sessionId);
    if (existing) return existing;

    return {
      sessionId,
      stage: "new",
      profile: {},
      messages: [],
      lastProductIds: [],
      score: 0,
      createdAt: now,
      updatedAt: now
    };
  }
}

export function extractProfile(text: string): CustomerProfile {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const budget = extractBudget(text);
  const timeline = extractTimeline(text);
  const name = extractName(text);
  const consentToContact = /\b(autorizo|pode me chamar|pode entrar em contato|sim,?\s*pode|aceito contato)\b/i.test(text);
  const pain = extractPain(text);

  return removeUndefined({
    email,
    budget,
    timeline,
    name,
    pain,
    consentToContact: consentToContact ? true : undefined
  });
}

function extractBudget(text: string): number | undefined {
  const match = text.match(/(?:r\$|\$|orcamento|budget|verba|ate)\s*([\d.,]+)/i);
  if (!match) return undefined;

  const normalized = match[1].replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);

  return Number.isFinite(value) ? value : undefined;
}

function extractTimeline(text: string): Timeline | undefined {
  if (/\b(agora|hoje|urgente|imediato|essa semana)\b/i.test(text)) return "now";
  if (/\b(este mes|esse mes|mes que vem|30 dias)\b/i.test(normalize(text))) return "this_month";
  if (/\b(trimestre|quarter|90 dias)\b/i.test(normalize(text))) return "this_quarter";
  if (/\b(sem pressa|mais pra frente|futuro|ano que vem)\b/i.test(normalize(text))) return "later";
  return undefined;
}

function extractName(text: string): string | undefined {
  const match = text.match(/\b(?:meu nome (?:e|\u00e9)|me chamo|sou)\s+([\p{L}][\p{L}' -]{1,40})/iu);
  return match?.[1]?.trim();
}

function extractPain(text: string): string | undefined {
  if (!/\b(preciso|quero|busco|problema|dificuldade|dor|vender|vendas|leads|atendimento)\b/i.test(text)) {
    return undefined;
  }

  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function mergeProfiles(...profiles: Array<CustomerProfile | undefined>): CustomerProfile {
  return profiles.reduce<CustomerProfile>((merged, profile) => {
    if (!profile) return merged;

    return removeUndefined({
      ...merged,
      ...profile
    });
  }, {});
}

function composeResponse(conversation: Conversation, products: Product[]): string {
  const { profile, stage } = conversation;
  const missing = missingQualificationFields(profile);

  if (stage === "handoff") {
    return [
      `Perfeito${profile.name ? `, ${profile.name}` : ""}. Ja tenho o contexto principal e vou encaminhar para um consultor.`,
      "Enquanto isso, posso deixar uma recomendacao objetiva: priorize a opcao com melhor aderencia ao seu volume e prazo."
    ].join(" ");
  }

  if (stage === "proposal" && products[0]) {
    const product = products[0];
    return [
      `Pelo que entendi, ${product.name} parece ser a melhor opcao agora.`,
      `${product.description}`,
      "Quer que eu monte uma proposta inicial e confirme os proximos passos por email?"
    ].join(" ");
  }

  if (missing.includes("pain")) {
    return "Me conta rapidinho: qual problema de vendas voce quer resolver primeiro?";
  }

  if (missing.includes("email")) {
    return "Boa. Qual email posso usar para enviar a recomendacao e manter o historico da conversa?";
  }

  if (missing.includes("budget")) {
    return "Entendi. Qual faixa de orcamento voce imaginou para resolver isso?";
  }

  if (missing.includes("timeline")) {
    return "Qual e o prazo ideal para colocar isso funcionando: agora, este mes, este trimestre ou mais pra frente?";
  }

  return "Tenho informacoes suficientes para recomendar uma opcao. Quer que eu avance para uma proposta inicial?";
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as T;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
