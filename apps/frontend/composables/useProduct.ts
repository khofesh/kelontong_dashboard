import { productService } from "~/services/product.service";
import type { Product } from "~/types/product";
import { ApiError } from "~/utils/api-client";

export function useProduct(id: MaybeRefOrGetter<number>) {
  const product = ref<Product | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const notFound = ref(false);

  async function load(): Promise<void> {
    const productId = toValue(id);
    loading.value = true;
    error.value = null;
    notFound.value = false;
    if (!Number.isInteger(productId) || productId < 1) {
      notFound.value = true;
      loading.value = false;
      return;
    }
    try {
      product.value = await productService.get(productId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) notFound.value = true;
      else
        error.value =
          err instanceof ApiError ? err.message : "Gagal memuat produk";
    } finally {
      loading.value = false;
    }
  }

  watch(() => toValue(id), load, { immediate: true });

  return { product, loading, error, notFound, load };
}
