import { useApi } from "~/composables/useApi";
import type { PaginationMeta } from "~/types/api";
import type { Product, ProductInput, ProductListQuery } from "~/types/product";

export const productService = {
  async list(
    query: ProductListQuery,
  ): Promise<{ items: Product[]; meta: PaginationMeta }> {
    const result = await useApi().get<Product[]>(
      "/products",
      query as Record<string, unknown>,
    );
    return {
      items: result.data,
      meta: result.meta ?? {
        page: 1,
        pageSize: query.pageSize ?? 20,
        totalItems: result.data.length,
        totalPages: 1,
      },
    };
  },

  async get(id: number): Promise<Product> {
    const { data } = await useApi().get<Product>(`/products/${id}`);
    return data;
  },

  async create(input: ProductInput): Promise<Product> {
    const { data } = await useApi().post<Product>("/products", input);
    return data;
  },

  async update(id: number, input: Partial<ProductInput>): Promise<Product> {
    const { data } = await useApi().patch<Product>(`/products/${id}`, input);
    return data;
  },

  async archive(id: number): Promise<void> {
    await useApi().delete(`/products/${id}`);
  },

  async restore(id: number): Promise<Product> {
    const { data } = await useApi().post<Product>(`/products/${id}/restore`);
    return data;
  },

  async setActive(id: number, isActive: boolean): Promise<Product> {
    return this.update(id, { isActive });
  },
};
