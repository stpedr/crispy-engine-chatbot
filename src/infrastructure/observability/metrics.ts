import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client";
import type { BotMetrics } from "../../domain/ports";
import type { Channel } from "../../domain/types";

export interface MetricsConfig {
  serviceName: string;
  enabled: boolean;
}

export interface AppMetrics extends BotMetrics {
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
    }
  };
}
