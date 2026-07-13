import type { AppLogger, ModelMetrics, SalesCopyGenerator } from "../../domain/ports";

type GuardReason = "prompt_injection" | "off_topic" | "oversized";

export class SalesTopicGuardGenerator implements SalesCopyGenerator {
  constructor(
    private readonly primary: SalesCopyGenerator,
    private readonly safeFallback: SalesCopyGenerator,
    private readonly logger: AppLogger,
    private readonly metrics: ModelMetrics
  ) {}

  async generate(input: Parameters<SalesCopyGenerator["generate"]>[0]): Promise<string> {
    const lastCustomerMessage = [...input.conversation.messages]
      .reverse()
      .find((message) => message.role === "customer")?.text ?? "";
    const reason = findGuardReason(lastCustomerMessage, input.conversation.stage);
    if (!reason) return this.primary.generate(input);

    this.metrics.recordModelGuardrailBlock({ reason });
    this.logger.info(
      { sessionId: input.conversation.sessionId, reason },
      "message bypassed local model guardrail"
    );
    return this.safeFallback.generate(input);
  }
}

export function findGuardReason(message: string, stage: string): GuardReason | undefined {
  if (message.length > 1200) return "oversized";
  const normalized = normalize(message);
  if (
    /(ignore|desconsidere|esqueca|revele|mostre).{0,100}(instruc|regra|prompt|sistema)/.test(normalized) ||
    /(finja que|mude (seu|de) papel|jailbreak|nao fale.{0,50}(vend|produto|crm))/.test(normalized)
  ) {
    return "prompt_injection";
  }

  if (hasExplicitOffTopicSignal(normalized)) return "off_topic";
  if (stage === "new" && !hasCommercialOrQualificationSignal(normalized)) return "off_topic";
  return undefined;
}

export function hasExplicitOffTopicSignal(message: string): boolean {
  const normalized = normalize(message);
  return /(receita|bolo|capital da|presidente|politic|futebol|filme|musica|religiao|noticia|previsao do tempo|codigo fonte|programacao|poema|piada)/.test(normalized);
}

function hasCommercialOrQualificationSignal(message: string): boolean {
  return /(vend|produto|solucao|negocio|empresa|orcamento|prazo|email|contato|proposta|consultor|recomend|necessidade|desafio|automat|atendimento|lead|crm|whatsapp|instagram|r\$|@|autorizo|me chamo|meu nome|agora|este mes|trimestre)/.test(message);
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
