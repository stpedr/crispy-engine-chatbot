import { randomUUID } from "crypto";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { decideLeadStage, scoreLead } from "../domain/leadScoring";
import type {
  AppLogger,
  BotMetrics,
  ConversationRepository,
  EventPublisher,
  LeadRepository,
  ProductCatalog,
  SalesCopyGenerator
} from "../domain/ports";
import type { BotInput, BotReply, Conversation, CustomerProfile, Lead, Timeline } from "../domain/types";

export interface SalesBotDependencies {
  conversations: ConversationRepository;
  leads: LeadRepository;
  catalog: ProductCatalog;
  events: EventPublisher;
  copyGenerator: SalesCopyGenerator;
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
    const previousStage = conversation.stage;
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

    const responseText = await this.deps.copyGenerator.generate({ conversation, products: recommendedProducts });
    const handoff = conversation.stage === "handoff";

    conversation.messages.push({
      id: randomUUID(),
      role: "bot",
      text: responseText,
      at: new Date().toISOString()
    });
    conversation.updatedAt = new Date().toISOString();

    await this.deps.conversations.save(conversation);
    const lead = await this.saveLead(conversation, input.channel, now);

    if (handoff && previousStage !== "handoff" && lead.handoffStatus === "queued") {
      const event = {
        id: randomUUID(),
        type: "lead.handoff.requested" as const,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        payload: {
          leadId: lead.id,
          sessionId: lead.sessionId
        }
      };
      await this.deps.events.publish(event);
    }

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
        leadId: lead.id,
        handoffStatus: lead.handoffStatus,
        recommendedProductIds: conversation.lastProductIds
      },
      "sales bot message handled"
    );

    return {
      leadId: lead.id,
      sessionId: input.sessionId,
      text: responseText,
      stage: conversation.stage,
      score: conversation.score,
      recommendedProducts,
      handoff
    };
  }

  private async saveLead(conversation: Conversation, channel: BotInput["channel"], now: string): Promise<Lead> {
    const existing = await this.deps.leads.findBySessionId(conversation.sessionId);
    const entersHandoff = conversation.stage === "handoff" && existing?.stage !== "handoff";
    const handoffStatus = entersHandoff && existing?.handoffStatus !== "completed"
      ? "queued"
      : existing?.handoffStatus ?? "not_requested";

    const lead: Lead = {
      id: existing?.id ?? randomUUID(),
      sessionId: conversation.sessionId,
      channel,
      profile: conversation.profile,
      stage: conversation.stage,
      score: conversation.score,
      productIds: conversation.lastProductIds,
      handoffStatus,
      handoffAttempts: existing?.handoffAttempts ?? 0,
      crmContactId: existing?.crmContactId,
      crmProvider: existing?.crmProvider,
      lastError: existing?.lastError,
      createdAt: existing?.createdAt ?? now,
      updatedAt: new Date().toISOString()
    };

    await this.deps.leads.save(lead);
    return lead;
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

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as T;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
