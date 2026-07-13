import type {
  AppLogger,
  DomainEventHandler,
  EventBus,
  EventMetrics
} from "../../domain/ports";
import type { DomainEvent } from "../../domain/types";

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<DomainEvent["type"], Set<DomainEventHandler>>();
  private readonly queue: DomainEvent[] = [];
  private processing?: Promise<void>;
  private stopped = false;

  constructor(
    private readonly logger: AppLogger,
    private readonly metrics: EventMetrics
  ) {}

  subscribe(type: DomainEvent["type"], handler: DomainEventHandler): () => void {
    const handlers = this.handlers.get(type) ?? new Set<DomainEventHandler>();
    handlers.add(handler);
    this.handlers.set(type, handlers);
    return () => handlers.delete(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.stopped) throw new Error("event bus is stopped");

    this.queue.push(structuredClone(event));
    this.metrics.recordLeadEvent({ type: event.type });
    this.metrics.setEventQueueDepth(this.queue.length);
    this.logger.info(
      { eventId: event.id, eventType: event.type, correlationId: event.correlationId },
      "domain event queued"
    );
    this.scheduleProcessing();
  }

  async drain(): Promise<void> {
    await this.processing;
    if (this.queue.length > 0) {
      this.scheduleProcessing();
      await this.processing;
    }
  }

  async stop(): Promise<void> {
    await this.drain();
    this.stopped = true;
    this.handlers.clear();
  }

  private scheduleProcessing(): void {
    if (this.processing) return;
    this.processing = this.processQueue().finally(() => {
      this.processing = undefined;
      if (this.queue.length > 0 && !this.stopped) this.scheduleProcessing();
    });
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) continue;
      this.metrics.setEventQueueDepth(this.queue.length);
      const handlers = [...(this.handlers.get(event.type) ?? [])];

      if (handlers.length === 0) {
        this.logger.warn({ eventId: event.id, eventType: event.type }, "domain event has no handlers");
        continue;
      }

      for (const handler of handlers) {
        try {
          await handler(structuredClone(event));
        } catch (error) {
          this.logger.error(
            {
              eventId: event.id,
              eventType: event.type,
              error: error instanceof Error ? error.message : String(error)
            },
            "domain event handler failed"
          );
        }
      }
    }
  }
}
