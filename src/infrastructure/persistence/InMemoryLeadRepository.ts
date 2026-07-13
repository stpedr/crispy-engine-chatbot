import type { LeadRepository } from "../../domain/ports";
import type { Lead } from "../../domain/types";

export class InMemoryLeadRepository implements LeadRepository {
  private readonly leads = new Map<string, Lead>();

  async findById(id: string): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    return lead ? structuredClone(lead) : undefined;
  }

  async findBySessionId(sessionId: string): Promise<Lead | undefined> {
    const lead = [...this.leads.values()].find((item) => item.sessionId === sessionId);
    return lead ? structuredClone(lead) : undefined;
  }

  async list(): Promise<Lead[]> {
    return [...this.leads.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((lead) => structuredClone(lead));
  }

  async save(lead: Lead): Promise<void> {
    this.leads.set(lead.id, structuredClone(lead));
  }
}
