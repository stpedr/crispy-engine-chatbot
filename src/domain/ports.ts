import type { Channel, Conversation, CustomerProfile, Product } from "./types";

export interface ConversationRepository {
  findBySessionId(sessionId: string): Promise<Conversation | undefined>;
  save(conversation: Conversation): Promise<void>;
}

export interface ProductCatalog {
  list(): Promise<Product[]>;
  search(query: string, profile: CustomerProfile): Promise<Product[]>;
}

export interface BotMetrics {
  recordBotMessage(input: { stage: string; channel: Channel; handoff: boolean }): void;
}

export interface AppLogger {
  info(data: Record<string, unknown>, message?: string): void;
  warn(data: Record<string, unknown>, message?: string): void;
  error(data: Record<string, unknown>, message?: string): void;
  debug(data: Record<string, unknown>, message?: string): void;
  child(bindings: Record<string, unknown>): AppLogger;
}
