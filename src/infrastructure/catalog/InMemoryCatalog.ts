import type { ProductCatalog } from "../../domain/ports";
import type { CustomerProfile, Product } from "../../domain/types";

const products: Product[] = [
  {
    id: "starter",
    name: "Sales Starter",
    description: "Pacote para validar atendimento comercial, capturar leads e responder duvidas frequentes.",
    priceCents: 99000,
    tags: ["leads", "atendimento", "validacao", "pequena empresa", "starter"]
  },
  {
    id: "growth",
    name: "Sales Growth",
    description: "Automacao de qualificacao, handoff para CRM e relatorios para times em crescimento.",
    priceCents: 249000,
    tags: ["crm", "qualificacao", "automacao", "relatorios", "growth", "vendas"]
  },
  {
    id: "enterprise",
    name: "Sales Enterprise",
    description: "Arquitetura customizada com integracoes, governanca, observabilidade e suporte dedicado.",
    priceCents: 799000,
    tags: ["enterprise", "integracao", "governanca", "observabilidade", "suporte", "escala"]
  }
];

export class InMemoryProductCatalog implements ProductCatalog {
  async list(): Promise<Product[]> {
    return structuredClone(products);
  }

  async search(query: string, profile: CustomerProfile): Promise<Product[]> {
    const terms = tokenize(`${query} ${profile.pain ?? ""}`);

    return products
      .map((product) => ({
        product,
        score: scoreProduct(product, terms, profile)
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((entry) => entry.product);
  }
}

export function getDefaultProducts(): Product[] {
  return [...products];
}

function scoreProduct(product: Product, terms: string[], profile: CustomerProfile): number {
  const searchable = tokenize([product.name, product.description, product.tags.join(" ")].join(" "));
  let score = terms.filter((term) => searchable.includes(term)).length * 10;

  if (profile.budget) {
    const price = product.priceCents / 100;
    if (profile.budget >= price) score += 8;
    if (profile.budget < price * 0.5) score -= 5;
  }

  if (profile.timeline === "now" && product.id !== "enterprise") score += 3;
  if (profile.company && product.id !== "starter") score += 3;

  return score;
}

function tokenize(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}
