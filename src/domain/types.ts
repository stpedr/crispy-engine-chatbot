export const CHANNELS = ["web", "whatsapp", "instagram", "phone", "crm"] as const;

export type Channel = (typeof CHANNELS)[number];

export type LeadStage = "new" | "qualifying" | "qualified" | "proposal" | "handoff";

export type MessageRole = "customer" | "bot" | "system";

export type Timeline = "now" | "this_month" | "this_quarter" | "later";

export type LeadHandoffStatus = "not_requested" | "queued" | "processing" | "completed" | "failed";

export interface CustomerProfile {
  name?: string;
  email?: string;
  company?: string;
  budget?: number;
  pain?: string;
  timeline?: Timeline;
  consentToContact?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  tags: string[];
  imageUrl?: string;
}

export type SalesTone = "consultative" | "direct" | "friendly";

export interface SalesWorkspace {
  id: string;
  businessName: string;
  segment: string;
  targetAudience: string;
  valueProposition: string;
  brandColor: string;
  salesEmail?: string;
  whatsapp?: string;
  tone: SalesTone;
  greeting: string;
  handoffMessage: string;
  products: Product[];
  status: "active";
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  text: string;
  at: string;
  channel?: Channel;
}

export interface Conversation {
  sessionId: string;
  stage: LeadStage;
  profile: CustomerProfile;
  messages: ConversationMessage[];
  lastProductIds: string[];
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  sessionId: string;
  channel: Channel;
  profile: CustomerProfile;
  stage: LeadStage;
  score: number;
  productIds: string[];
  handoffStatus: LeadHandoffStatus;
  handoffAttempts: number;
  crmContactId?: string;
  crmProvider?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadHandoffRequestedEvent {
  id: string;
  type: "lead.handoff.requested";
  occurredAt: string;
  correlationId?: string;
  payload: {
    leadId: string;
    sessionId: string;
  };
}

export type DomainEvent = LeadHandoffRequestedEvent;

export interface BotInput {
  sessionId: string;
  text: string;
  channel: Channel;
  customer?: CustomerProfile;
  correlationId?: string;
}

export interface BotReply {
  leadId: string;
  sessionId: string;
  text: string;
  stage: LeadStage;
  score: number;
  recommendedProducts: Product[];
  handoff: boolean;
  profile: CustomerProfile;
  traceId?: string;
}

export interface CrmSyncResult {
  contactId: string;
  provider: string;
}
