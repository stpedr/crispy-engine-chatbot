import type { IdempotencyStore } from "../../domain/ports";

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly keys = new Set<string>();

  constructor(private readonly maxEntries = 10_000) {}

  async claim(key: string): Promise<boolean> {
    if (this.keys.has(key)) return false;
    if (this.keys.size >= this.maxEntries) {
      const oldest = this.keys.values().next().value as string | undefined;
      if (oldest) this.keys.delete(oldest);
    }
    this.keys.add(key);
    return true;
  }
}
