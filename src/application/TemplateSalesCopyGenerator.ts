import { missingQualificationFields } from "../domain/leadScoring";
import type { SalesCopyGenerator } from "../domain/ports";

export class TemplateSalesCopyGenerator implements SalesCopyGenerator {
  async generate(input: Parameters<SalesCopyGenerator["generate"]>[0]): Promise<string> {
    const { conversation, products, workspace } = input;
    const { profile, stage } = conversation;
    const missing = missingQualificationFields(profile);

    if (stage === "handoff") {
      if (workspace?.handoffMessage) return workspace.handoffMessage;
      return [
        `Perfeito${profile.name ? `, ${profile.name}` : ""}. Ja tenho o contexto principal e vou encaminhar para um consultor.`,
        "Enquanto isso, priorize a opcao com melhor aderencia ao seu volume e prazo."
      ].join(" ");
    }

    if (stage === "proposal" && products[0]) {
      const product = products[0];
      return [
        `Pelo que entendi, ${product.name} parece ser a melhor opcao agora.`,
        product.description,
        workspace?.valueProposition ? workspace.valueProposition : "",
        "Quer que eu monte uma proposta inicial e confirme os proximos passos por email?"
      ].filter(Boolean).join(" ");
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
}
