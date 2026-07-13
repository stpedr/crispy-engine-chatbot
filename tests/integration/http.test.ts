import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../../src/config/env";
import { buildServer } from "../../src/infrastructure/http/server";
import { nullLogger } from "../../src/infrastructure/logging/logger";

describe("HTTP API", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("accepts a message and returns a bot reply", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {
        sessionId: "http-1",
        channel: "web",
        text: "Quero automatizar leads"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sessionId: "http-1",
      stage: "qualifying",
      handoff: false
    });
  });

  it("serves the sales chat at the root route", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Sales Bot");
    expect(response.body).toContain('id="composer"');
  });

  it("exposes prometheus metrics", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    await app.inject({
      method: "GET",
      url: "/health"
    });

    const response = await app.inject({
      method: "GET",
      url: "/metrics"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("http_request_duration_seconds");
  });

  it("lists the product menu", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({ method: "GET", url: "/products" });

    expect(response.statusCode).toBe(200);
    expect(response.json().products).toHaveLength(3);
    expect(response.json().products[0]).toMatchObject({ id: "starter" });
  });

  it("rejects invalid payloads", async () => {
    app = await buildServer({
      config: loadConfig({
        NODE_ENV: "test",
        SERVICE_NAME: "sales-bot-test",
        LOG_LEVEL: "silent",
        LOG_PRETTY: "false",
        METRICS_ENABLED: "true",
        PORT: "3000"
      }),
      logger: nullLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {
        sessionId: "",
        text: ""
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_request"
    });
  });
});
