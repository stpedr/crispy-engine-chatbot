import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Conversation, Lead } from "../../src/domain/types";
import {
  JsonConversationRepository,
  JsonFileStore,
  JsonLeadRepository
} from "../../src/infrastructure/persistence/JsonFileStore";

describe("JsonFileStore", () => {
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("persists conversations and leads across store instances", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "sales-bot-test-"));
    const file = join(temporaryDirectory, "store.json");
    const firstStore = new JsonFileStore(file);
    const conversations = new JsonConversationRepository(firstStore);
    const leads = new JsonLeadRepository(firstStore);
    const now = new Date().toISOString();
    const conversation: Conversation = {
      sessionId: "persistent-session",
      stage: "qualifying",
      profile: { pain: "Quero vender mais" },
      messages: [],
      lastProductIds: ["growth"],
      score: 20,
      createdAt: now,
      updatedAt: now
    };
    const lead: Lead = {
      id: "a78414b5-7a6f-42de-b5ab-6621457f4daf",
      sessionId: conversation.sessionId,
      channel: "web",
      profile: conversation.profile,
      stage: conversation.stage,
      score: conversation.score,
      productIds: conversation.lastProductIds,
      handoffStatus: "not_requested",
      handoffAttempts: 0,
      createdAt: now,
      updatedAt: now
    };

    await conversations.save(conversation);
    await leads.save(lead);

    const secondStore = new JsonFileStore(file);
    expect(await new JsonConversationRepository(secondStore).findBySessionId(conversation.sessionId))
      .toEqual(conversation);
    expect(await new JsonLeadRepository(secondStore).findById(lead.id)).toEqual(lead);
  });
});
