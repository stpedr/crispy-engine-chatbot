import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type { AppLogger } from "../../domain/ports";

let sdk: NodeSDK | undefined;

export async function startTracing(input: {
  endpoint?: string;
  logger: AppLogger;
}): Promise<void> {
  if (!input.endpoint) {
    input.logger.info({}, "tracing disabled: OTEL_EXPORTER_OTLP_ENDPOINT is empty");
    return;
  }

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: input.endpoint }),
    instrumentations: [getNodeAutoInstrumentations()]
  });

  sdk.start();
  input.logger.info({ endpoint: input.endpoint }, "tracing enabled");
}

export async function stopTracing(): Promise<void> {
  await sdk?.shutdown();
}
