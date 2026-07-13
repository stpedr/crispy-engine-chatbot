import pino, { type LoggerOptions } from "pino";
import type { AppLogger } from "../../domain/ports";

export interface LoggerConfig {
  level: string;
  pretty: boolean;
  serviceName: string;
}

export function createLogger(config: LoggerConfig): AppLogger {
  const options: LoggerOptions = {
    level: config.level,
    base: {
      service: config.serviceName
    },
    redact: {
      paths: [
        "email",
        "*.email",
        "profile.email",
        "customer.email",
        "body.customer.email",
        "headers.authorization",
        "headers.x-webhook-token"
      ],
      censor: "[REDACTED]"
    }
  };

  if (config.pretty) {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard"
      }
    };
  }

  return pino(options) as AppLogger;
}

export const nullLogger: AppLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => nullLogger
};
