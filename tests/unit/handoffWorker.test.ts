import { describe, expect, it } from "vitest";
import { HandoffWorker } from "../../src/application/HandoffWorker";
import type { CrmGateway, EventMetrics, HandoffMetrics } from "../../src/domain/ports";
import type { Lead } from "../../src/domain/types";
import { InMemoryEventBus } from "../../src/infrastructure/events/InMemoryEventBus";
import { nullLogger } from "../../src/infrastructure/logging/logger";
import { InMemoryLeadRepository } from "../../src/infrastructure/persistence/InMemoryLeadRepository";

const eventMetrics: EventMetrics = {
  recordLeadEvent: () => undefined,
  setEventQueueDepth: () => undefined
};

describe("HandoffWorker", () => {
  it("retries CRM synchronization and completes the handoff", async () => {
    const events = new InMemoryEventBus(nullLogger, eventMetrics);
    const leads = new InMemoryLeadRepository();
    const outcomes: string[] = [];
    const metrics: HandoffMetrics = {
      recordHandoff: (input) => outcomes.push(input.status)
    };
    let calls = 0;
    const crm: CrmGateway = {
      async syncLead() {
        calls += 1;
        if (calls === 1) throw new Error("temporary CRM failure");
        return { contactId: "crm-123", provider: "test-crm" };
      }
    };
    const lead = buildLead();
    await leads.save(lead);
    const worker = new HandoffWorker({
      events,
      leads,
      crm,
      logger: nullLogger,
      metrics,
      maxAttempts: 3,
      retryDelayMs: 0
    });
    worker.start();

    await events.publish({
      id: "event-1",
      type: "lead.handoff.requested",
      occurredAt: new Date().toISOString(),
      payload: { leadId: lead.id, sessionId: lead.sessionId }
    });
    await events.drain();

    expect(calls).toBe(2);
    expect(outcomes).toEqual(["completed"]);
    expect(await leads.findById(lead.id)).toMatchObject({
      handoffStatus: "completed",
      handoffAttempts: 2,
      crmContactId: "crm-123",
      crmProvider: "test-crm"
    });

    await events.publish({
      id: "event-duplicate",
      type: "lead.handoff.requested",
      occurredAt: new Date().toISOString(),
      payload: { leadId: lead.id, sessionId: lead.sessionId }
    });
    await events.drain();

    expect(calls).toBe(2);
    expect(outcomes).toEqual(["completed", "skipped"]);
    worker.stop();
    await events.stop();
  });
});

function buildLead(): Lead {
  const now = new Date().toISOString();
  return {
    id: "91a17d19-28d4-4f95-990b-d5a17b306748",
    sessionId: "handoff-session",
    channel: "web",
    profile: { email: "lead@example.com", consentToContact: true },
    stage: "handoff",
    score: 90,
    productIds: ["growth"],
    handoffStatus: "queued",
    handoffAttempts: 0,
    createdAt: now,
    updatedAt: now
  };
}
