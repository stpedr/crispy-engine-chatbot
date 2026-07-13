import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ConversationRepository, LeadRepository } from "../../domain/ports";
import type { Conversation, Lead } from "../../domain/types";

interface StoreState {
  conversations: Record<string, Conversation>;
  leads: Record<string, Lead>;
}

const emptyState = (): StoreState => ({ conversations: {}, leads: {} });

export class JsonFileStore {
  private state?: StoreState;
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async read<T>(reader: (state: StoreState) => T): Promise<T> {
    await this.writes;
    const state = await this.load();
    return structuredClone(reader(state));
  }

  async update(mutator: (state: StoreState) => void): Promise<void> {
    const operation = this.writes.then(async () => {
      const state = await this.load();
      mutator(state);
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8");
      await rename(temporaryPath, this.filePath);
    });
    this.writes = operation.catch(() => undefined);
    await operation;
  }

  private async load(): Promise<StoreState> {
    if (this.state) return this.state;

    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as Partial<StoreState>;
      this.state = {
        conversations: parsed.conversations ?? {},
        leads: parsed.leads ?? {}
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.state = emptyState();
    }

    return this.state;
  }
}

export class JsonConversationRepository implements ConversationRepository {
  constructor(private readonly store: JsonFileStore) {}

  findBySessionId(sessionId: string): Promise<Conversation | undefined> {
    return this.store.read((state) => state.conversations[sessionId]);
  }

  save(conversation: Conversation): Promise<void> {
    return this.store.update((state) => {
      state.conversations[conversation.sessionId] = structuredClone(conversation);
    });
  }
}

export class JsonLeadRepository implements LeadRepository {
  constructor(private readonly store: JsonFileStore) {}

  findById(id: string): Promise<Lead | undefined> {
    return this.store.read((state) => state.leads[id]);
  }

  findBySessionId(sessionId: string): Promise<Lead | undefined> {
    return this.store.read((state) => Object.values(state.leads).find((lead) => lead.sessionId === sessionId));
  }

  list(): Promise<Lead[]> {
    return this.store.read((state) =>
      Object.values(state.leads).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    );
  }

  save(lead: Lead): Promise<void> {
    return this.store.update((state) => {
      state.leads[lead.id] = structuredClone(lead);
    });
  }
}
