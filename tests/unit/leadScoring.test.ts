import { describe, expect, it } from "vitest";
import { decideLeadStage, missingQualificationFields, scoreLead } from "../../src/domain/leadScoring";

describe("lead scoring", () => {
  it("scores a complete, urgent lead as high intent", () => {
    const score = scoreLead({
      name: "Ana",
      email: "ana@example.com",
      company: "Acme",
      pain: "Preciso automatizar qualificacao de leads",
      budget: 5000,
      timeline: "now",
      consentToContact: true
    });

    expect(score).toBe(100);
  });

  it("keeps incomplete leads in qualification", () => {
    const profile = {
      pain: "Quero vender mais pelo WhatsApp"
    };

    expect(scoreLead(profile)).toBe(20);
    expect(missingQualificationFields(profile)).toEqual(["email", "budget", "timeline"]);
  });

  it("moves high-intent leads with consent to handoff", () => {
    const stage = decideLeadStage({
      score: 90,
      profile: {
        email: "ana@example.com",
        consentToContact: true
      },
      recommendedProducts: [
        {
          id: "growth",
          name: "Sales Growth",
          description: "Automacao comercial",
          priceCents: 249000,
          tags: ["vendas"]
        }
      ]
    });

    expect(stage).toBe("handoff");
  });
});
