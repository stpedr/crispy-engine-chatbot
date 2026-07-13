import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";
import type { BotMetrics, EventMetrics, HandoffMetrics } from "../../domain/ports";
import type { Channel } from "../../domain/types";

export interface MetricsConfig {
  serviceName: string;
  enabled: boolean;
}

export interface AppMetrics extends BotMetrics, EventMetrics, HandoffMetrics {
  contentType: string;
  metrics(): Promise<string>;
  recordHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationSeconds: number;
  }): void;
}

export function createMetrics(config: MetricsConfig): AppMetrics {
  const registry = new Registry();
  registry.setDefaultLabels({ service: config.serviceName });

  if (config.enabled) {
    collectDefaultMetrics({ register: registry });
  }

  const httpDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds.",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry]
  });

  const botMessages = new Counter({
    name: "bot_messages_total",
    help: "Total sales bot messages handled.",
    labelNames: ["stage", "channel", "handoff"],
    registers: [registry]
  });

  const leadEvents = new Counter({
    name: "lead_events_total",
    help: "Total lead domain events published.",
    labelNames: ["type"],
    registers: [registry]
  });

  const handoffs = new Counter({
    name: "lead_handoffs_total",
    help: "Total lead handoff outcomes.",
    labelNames: ["status", "provider"],
    registers: [registry]
  });

  const eventQueueDepth = new Gauge({
    name: "event_queue_depth",
    help: "Current number of events waiting in the local queue.",
    registers: [registry]
  });

  return {
    contentType: registry.contentType,
    async metrics() {
      return registry.metrics();
    },
    recordHttpRequest(input) {
      if (!config.enabled) return;
      httpDuration
        .labels(input.method, input.route, String(input.statusCode))
        .observe(input.durationSeconds);
    },
    recordBotMessage(input: { stage: string; channel: Channel; handoff: boolean }) {
      if (!config.enabled) return;
      botMessages.labels(input.stage, input.channel, String(input.handoff)).inc();
    },
    recordLeadEvent(input) {
      if (!config.enabled) return;
      leadEvents.labels(input.type).inc();
    },
    recordHandoff(input) {
      if (!config.enabled) return;
      handoffs.labels(input.status, input.provider).inc();
    },
    setEventQueueDepth(depth) {
      if (!config.enabled) return;
      eventQueueDepth.set(depth);
    }
  };
}
