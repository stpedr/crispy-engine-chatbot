import type { CrmGateway } from "../../domain/ports";
import type { CrmSyncResult, Lead } from "../../domain/types";

export class InMemoryCrmGateway implements CrmGateway {
  private readonly contacts = new Map<string, Lead>();

  async syncLead(lead: Lead): Promise<CrmSyncResult> {
    const contactId = `local-${lead.id}`;
    this.contacts.set(contactId, structuredClone(lead));
    return { contactId, provider: "local-crm" };
  }

  getContact(contactId: string): Lead | undefined {
    const lead = this.contacts.get(contactId);
    return lead ? structuredClone(lead) : undefined;
  }
}
