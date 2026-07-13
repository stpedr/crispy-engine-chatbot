import type { CrmGateway } from "../../domain/ports";
import type { CrmSyncResult, Lead } from "../../domain/types";

export class HttpCrmGateway implements CrmGateway {
  constructor(
    private readonly config: {
      url: string;
      token?: string;
      timeoutMs: number;
    }
  ) {}

  async syncLead(lead: Lead, idempotencyKey: string): Promise<CrmSyncResult> {
    const response = await fetch(this.config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
        ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {})
      },
      body: JSON.stringify({ lead }),
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`CRM responded with status ${response.status}`);
    }

    const payload = await response.json() as { contactId?: unknown; provider?: unknown };
    if (typeof payload.contactId !== "string" || payload.contactId.length === 0) {
      throw new Error("CRM response does not include contactId");
    }

    return {
      contactId: payload.contactId,
      provider: typeof payload.provider === "string" ? payload.provider : "http-crm"
    };
  }
}
