import type {
  Channel,
  Conversation,
  CrmSyncResult,
  CustomerProfile,
  DomainEvent,
  Lead,
  Product,
  SalesWorkspace
} from "./types";

export interface ConversationRepository {
  findBySessionId(sessionId: string): Promise<Conversation | undefined>;
  save(conversation: Conversation): Promise<void>;
}

export interface ProductCatalog {
  list(): Promise<Product[]>;
  search(query: string, profile: CustomerProfile): Promise<Product[]>;
}

export interface SalesWorkspaceRepository {
  find(): Promise<SalesWorkspace | undefined>;
  save(workspace: SalesWorkspace): Promise<void>;
}

export interface LeadRepository {
  findById(id: string): Promise<Lead | undefined>;
  findBySessionId(sessionId: string): Promise<Lead | undefined>;
  list(): Promise<Lead[]>;
  save(lead: Lead): Promise<void>;
}

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface EventBus extends EventPublisher {
  subscribe(type: DomainEvent["type"], handler: DomainEventHandler): () => void;
  drain(): Promise<void>;
  stop(): Promise<void>;
}

export interface CrmGateway {
  syncLead(lead: Lead, idempotencyKey: string): Promise<CrmSyncResult>;
}

export interface SalesCopyGenerator {
  generate(input: { conversation: Conversation; products: Product[]; workspace?: SalesWorkspace }): Promise<string>;
}

export interface IdempotencyStore {
  claim(key: string): Promise<boolean>;
}

export interface BotMetrics {
  recordBotMessage(input: { stage: string; channel: Channel; handoff: boolean }): void;
}

export interface EventMetrics {
  recordLeadEvent(input: { type: DomainEvent["type"] }): void;
  setEventQueueDepth(depth: number): void;
}

export interface HandoffMetrics {
  recordHandoff(input: { status: "completed" | "failed" | "skipped"; provider: string }): void;
}

export interface ModelMetrics {
  recordModelRequest(input: {
    model: string;
    status: "success" | "invalid" | "error";
    durationSeconds: number;
  }): void;
  recordModelGuardrailBlock(input: { reason: "prompt_injection" | "off_topic" | "oversized" }): void;
}

export interface AcquisitionMetrics {
  recordWorkspaceActivation(input: { tone: string }): void;
}

export interface AppLogger {
  info(data: Record<string, unknown>, message?: string): void;
  warn(data: Record<string, unknown>, message?: string): void;
  error(data: Record<string, unknown>, message?: string): void;
  debug(data: Record<string, unknown>, message?: string): void;
  child(bindings: Record<string, unknown>): AppLogger;
}
