<script setup lang="ts">
import { productService } from "~/services/product.service";
import type { ProductInput } from "~/types/product";
import {
  type FieldErrors,
  apiFieldErrors,
  errorMessage,
} from "~/utils/form-errors";

const route = useRoute();
const id = computed(() => Number(route.params.id));
const { product, loading, error, notFound, load } = useProduct(id);
const { show } = useFlash();

useHead({
  title: () => `Edit ${product.value?.name ?? "produk"} · Kelontong`,
});

const submitting = ref(false);
const serverErrors = ref<FieldErrors>({});
const formError = ref<string | null>(null);

async function save(values: ProductInput): Promise<void> {
  submitting.value = true;
  serverErrors.value = {};
  formError.value = null;
  try {
    const updated = await productService.update(id.value, values);
    show("success", `${updated.name} berhasil diperbarui`);
    await navigateTo(`/products/${updated.id}`);
  } catch (err) {
    serverErrors.value = apiFieldErrors(err);
    formError.value = errorMessage(err, "Gagal menyimpan perubahan");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="container" style="max-width: 860px">
    <NuxtLink :to="`/products/${id}`" class="back-link"
      >← Kembali ke detail produk</NuxtLink
    >

    <div v-if="loading" class="card" aria-busy="true">
      <span class="skeleton" style="width: 40%; margin-bottom: 1rem" />
      <span class="skeleton" style="margin-bottom: 0.75rem" />
      <span class="skeleton" style="width: 70%" />
    </div>

    <EmptyState
      v-else-if="notFound"
      title="Produk tidak ditemukan"
      description="Produk mungkin sudah diarsipkan atau tidak pernah ada."
    >
      <NuxtLink to="/products" class="btn">Kembali ke daftar produk</NuxtLink>
    </EmptyState>

    <ErrorState
      v-else-if="error"
      title="Gagal memuat produk"
      :message="error"
      @retry="load"
    />

    <template v-else-if="product">
      <div class="page-header">
        <h1>Edit produk</h1>
      </div>
      <div v-if="product.archivedAt" class="alert alert--error">
        Produk ini diarsipkan. Pulihkan dari halaman detail sebelum mengedit.
      </div>
      <template v-else>
        <div v-if="formError" class="alert alert--error" role="alert">
          {{ formError }}
        </div>
        <ProductForm
          :key="product.id"
          :initial="product"
          submit-label="Simpan perubahan"
          :submitting="submitting"
          :server-errors="serverErrors"
          @submit="save"
          @cancel="navigateTo(`/products/${product.id}`)"
        />
      </template>
    </template>
  </main>
</template>
