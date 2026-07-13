import { loadConfig } from "./config/env";
import { buildServer } from "./infrastructure/http/server";
import { createLogger } from "./infrastructure/logging/logger";
import { startTracing, stopTracing } from "./infrastructure/observability/tracing";
import {
  JsonConversationRepository,
  JsonFileStore,
  JsonLeadRepository
} from "./infrastructure/persistence/JsonFileStore";

async function main() {
  const config = loadConfig();
  const logger = createLogger({
    level: config.logLevel,
    pretty: config.logPretty,
    serviceName: config.serviceName
  });

  await startTracing({
    endpoint: config.otelExporterOtlpEndpoint,
    logger
  });

  const store = new JsonFileStore(config.dataFile);
  const app = await buildServer({
    config,
    logger,
    conversations: new JsonConversationRepository(store),
    leads: new JsonLeadRepository(store)
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown started");
    await app.close();
    await stopTracing();
    logger.info({ signal }, "shutdown completed");
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.info({ port: config.port }, "sales bot listening");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
