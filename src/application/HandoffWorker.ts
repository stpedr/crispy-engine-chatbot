import type {
  AppLogger,
  CrmGateway,
  EventBus,
  HandoffMetrics,
  LeadRepository
} from "../domain/ports";
import type { LeadHandoffRequestedEvent } from "../domain/types";

export interface HandoffWorkerDependencies {
  events: EventBus;
  leads: LeadRepository;
  crm: CrmGateway;
  logger: AppLogger;
  metrics: HandoffMetrics;
  maxAttempts: number;
  retryDelayMs: number;
}

export class HandoffWorker {
  private unsubscribe?: () => void;

  constructor(private readonly deps: HandoffWorkerDependencies) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.deps.events.subscribe("lead.handoff.requested", (event) =>
      this.handle(event as LeadHandoffRequestedEvent)
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private async handle(event: LeadHandoffRequestedEvent): Promise<void> {
    const lead = await this.deps.leads.findById(event.payload.leadId);
    if (!lead) {
      this.deps.logger.error({ eventId: event.id, leadId: event.payload.leadId }, "handoff lead not found");
      return;
    }

    if (lead.handoffStatus === "completed") {
      this.deps.metrics.recordHandoff({ status: "skipped", provider: lead.crmProvider ?? "unknown" });
      this.deps.logger.info({ eventId: event.id, leadId: lead.id }, "handoff already completed");
      return;
    }

    for (let attempt = lead.handoffAttempts + 1; attempt <= this.deps.maxAttempts; attempt += 1) {
      lead.handoffStatus = "processing";
      lead.handoffAttempts = attempt;
      lead.updatedAt = new Date().toISOString();
      delete lead.lastError;
      await this.deps.leads.save(lead);

      try {
        const result = await this.deps.crm.syncLead(lead, event.id);
        lead.handoffStatus = "completed";
        lead.crmContactId = result.contactId;
        lead.crmProvider = result.provider;
        lead.updatedAt = new Date().toISOString();
        delete lead.lastError;
        await this.deps.leads.save(lead);
        this.deps.metrics.recordHandoff({ status: "completed", provider: result.provider });
        this.deps.logger.info(
          {
            eventId: event.id,
            correlationId: event.correlationId,
            leadId: lead.id,
            attempt,
            crmContactId: result.contactId,
            crmProvider: result.provider
          },
          "lead handoff completed"
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lead.lastError = message;
        lead.updatedAt = new Date().toISOString();
        this.deps.logger.warn(
          { eventId: event.id, leadId: lead.id, attempt, maxAttempts: this.deps.maxAttempts, error: message },
          "lead handoff attempt failed"
        );

        if (attempt < this.deps.maxAttempts) {
          await delay(this.deps.retryDelayMs * 2 ** (attempt - 1));
          continue;
        }

        lead.handoffStatus = "failed";
        await this.deps.leads.save(lead);
        this.deps.metrics.recordHandoff({ status: "failed", provider: lead.crmProvider ?? "unknown" });
      }
    }
  }
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
