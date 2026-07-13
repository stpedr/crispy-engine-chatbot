import type { AppLogger, SalesCopyGenerator } from "../../domain/ports";

export class HttpSalesCopyGenerator implements SalesCopyGenerator {
  constructor(
    private readonly config: {
      url: string;
      token?: string;
      timeoutMs: number;
    }
  ) {}

  async generate(input: Parameters<SalesCopyGenerator["generate"]>[0]): Promise<string> {
    const response = await fetch(this.config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {})
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    if (!response.ok) throw new Error(`copy generator responded with status ${response.status}`);
    const payload = await response.json() as { text?: unknown };
    if (typeof payload.text !== "string" || payload.text.trim().length === 0) {
      throw new Error("copy generator response does not include text");
    }
    return payload.text.trim();
  }
}

export class FallbackSalesCopyGenerator implements SalesCopyGenerator {
  constructor(
    private readonly primary: SalesCopyGenerator,
    private readonly fallback: SalesCopyGenerator,
    private readonly logger: AppLogger
  ) {}

  async generate(input: Parameters<SalesCopyGenerator["generate"]>[0]): Promise<string> {
    try {
      return await this.primary.generate(input);
    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "external copy generator failed; using template fallback"
      );
      return this.fallback.generate(input);
    }
  }
}
