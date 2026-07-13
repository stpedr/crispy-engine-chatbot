import type { SalesWorkspaceRepository } from "../../domain/ports";
import type { SalesWorkspace } from "../../domain/types";

export class InMemorySalesWorkspaceRepository implements SalesWorkspaceRepository {
  constructor(private workspace?: SalesWorkspace) {}

  async find(): Promise<SalesWorkspace | undefined> {
    return this.workspace ? structuredClone(this.workspace) : undefined;
  }

  async save(workspace: SalesWorkspace): Promise<void> {
    this.workspace = structuredClone(workspace);
  }
}
