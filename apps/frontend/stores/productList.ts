import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { productService } from "~/services/product.service";
import type { PaginationMeta } from "~/types/api";
import type { Product, ProductListQuery } from "~/types/product";
import { ApiError } from "~/utils/api-client";
import { defaultProductQuery } from "~/utils/product-query";

export type ProductListState = Required<
  Pick<
    ProductListQuery,
    "page" | "pageSize" | "archived" | "sortBy" | "sortOrder"
  >
> &
  Pick<ProductListQuery, "q" | "categoryId" | "isActive">;

function initialState(): ProductListState {
  return { ...defaultProductQuery };
}

export const useProductListStore = defineStore("productList", () => {
  const query = ref<ProductListState>(initialState());
  const items = ref<Product[]>([]);
  const meta = ref<PaginationMeta>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasLoaded = ref(false);
  let requestToken = 0;

  const totalItems = computed(() => meta.value.totalItems);

  function setQuery(next: ProductListState): void {
    query.value = { ...next };
  }

  function setResult(result: { items: Product[]; meta: PaginationMeta }): void {
    items.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  }

  async function fetchProducts(): Promise<void> {
    const token = ++requestToken;
    loading.value = true;
    error.value = null;
    try {
      const result = await productService.list(query.value);
      if (token !== requestToken) return;
      setResult(result);
    } catch (err) {
      if (token !== requestToken) return;
      error.value =
        err instanceof ApiError ? err.message : "Gagal memuat produk";
    } finally {
      if (token === requestToken) loading.value = false;
    }
  }

  async function toggleActive(product: Product): Promise<Product> {
    const index = items.value.findIndex((item) => item.id === product.id);
    if (index === -1) return product;

    const previous = items.value[index] as Product;
    const optimistic = { ...previous, isActive: !previous.isActive };
    items.value[index] = optimistic;

    try {
      const updated = await productService.setActive(
        product.id,
        optimistic.isActive,
      );
      const currentIndex = items.value.findIndex(
        (item) => item.id === product.id,
      );
      if (currentIndex !== -1) items.value[currentIndex] = updated;
      return updated;
    } catch (err) {
      const currentIndex = items.value.findIndex(
        (item) => item.id === product.id,
      );
      if (currentIndex !== -1) items.value[currentIndex] = previous;
      throw err;
    }
  }

  function reset(): void {
    query.value = initialState();
    items.value = [];
    meta.value = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };
    error.value = null;
    hasLoaded.value = false;
  }

  return {
    query,
    items,
    meta,
    loading,
    error,
    hasLoaded,
    totalItems,
    setQuery,
    setResult,
    fetchProducts,
    toggleActive,
    reset,
  };
});
