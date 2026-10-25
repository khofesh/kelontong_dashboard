<script setup lang="ts">
import { productService } from "~/services/product.service";
import type { ProductInput } from "~/types/product";
import {
  type FieldErrors,
  apiFieldErrors,
  errorMessage,
} from "~/utils/form-errors";

useHead({ title: "Tambah produk · Kelontong" });

const { show } = useFlash();
const submitting = ref(false);
const serverErrors = ref<FieldErrors>({});
const formError = ref<string | null>(null);

async function create(values: ProductInput): Promise<void> {
  submitting.value = true;
  serverErrors.value = {};
  formError.value = null;
  try {
    const product = await productService.create(values);
    show("success", `${product.name} berhasil ditambahkan`);
    await navigateTo(`/products/${product.id}`);
  } catch (err) {
    serverErrors.value = apiFieldErrors(err);
    formError.value = errorMessage(err, "Gagal menyimpan produk");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="container" style="max-width: 860px">
    <NuxtLink to="/products" class="back-link">
      ← Kembali ke daftar produk
    </NuxtLink>
    <div class="page-header">
      <h1>Tambah produk</h1>
    </div>
    <div v-if="formError" class="alert alert--error" role="alert">
      {{ formError }}
    </div>
    <ProductForm
      submit-label="Simpan produk"
      :submitting="submitting"
      :server-errors="serverErrors"
      @submit="create"
      @cancel="navigateTo('/products')"
    />
  </main>
</template>
