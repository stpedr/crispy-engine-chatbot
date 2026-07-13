import type { ConversationRepository } from "../../domain/ports";
import type { Conversation } from "../../domain/types";

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, Conversation>();

  async findBySessionId(sessionId: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(sessionId);
    return conversation ? structuredClone(conversation) : undefined;
  }

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.sessionId, structuredClone(conversation));
  }
}
