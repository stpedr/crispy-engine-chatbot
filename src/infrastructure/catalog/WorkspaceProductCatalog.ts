import type { ProductCatalog, SalesWorkspaceRepository } from "../../domain/ports";
import type { CustomerProfile, Product } from "../../domain/types";
import { getDefaultProducts, searchProducts } from "./InMemoryCatalog";

export class WorkspaceProductCatalog implements ProductCatalog {
  constructor(
    private readonly workspace: SalesWorkspaceRepository,
    private readonly fallbackProducts: Product[] = getDefaultProducts()
  ) {}

  async list(): Promise<Product[]> {
    const configured = await this.workspace.find();
    return structuredClone(configured?.products.length ? configured.products : this.fallbackProducts);
  }

  async search(query: string, profile: CustomerProfile): Promise<Product[]> {
    return searchProducts(await this.list(), query, profile);
  }
}
