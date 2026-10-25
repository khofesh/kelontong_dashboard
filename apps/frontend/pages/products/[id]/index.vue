<script setup lang="ts">
import { productService } from "~/services/product.service";
import { useAuthStore } from "~/stores/auth";
import { errorMessage } from "~/utils/form-errors";
import {
  formatDateTime,
  formatDimensions,
  formatNumber,
  formatRupiah,
  formatWeight,
} from "~/utils/formatters";

const route = useRoute();
const auth = useAuthStore();
const { show } = useFlash();
const id = computed(() => Number(route.params.id));
const { product, loading, error, notFound, load } = useProduct(id);
const busy = ref(false);

useHead({ title: () => `${product.value?.name ?? "Produk"} · Kelontong` });

async function run(
  action: () => Promise<void>,
  failure: string,
): Promise<void> {
  busy.value = true;
  try {
    await action();
  } catch (err) {
    show("error", errorMessage(err, failure));
  } finally {
    busy.value = false;
  }
}

function toggleActive(): Promise<void> {
  return run(async () => {
    const current = product.value!;
    product.value = await productService.setActive(
      current.id,
      !current.isActive,
    );
    show(
      "success",
      product.value.isActive ? "Produk diaktifkan" : "Produk dinonaktifkan",
    );
  }, "Gagal mengubah status produk");
}

function archive(): Promise<void> {
  const current = product.value!;
  if (!window.confirm(`Arsipkan produk "${current.name}"?`))
    return Promise.resolve();
  return run(async () => {
    await productService.archive(current.id);
    show("success", `${current.name} diarsipkan`);
    await navigateTo("/products");
  }, "Gagal mengarsipkan produk");
}

function restore(): Promise<void> {
  return run(async () => {
    product.value = await productService.restore(product.value!.id);
    show("success", "Produk dipulihkan");
  }, "Gagal memulihkan produk");
}
</script>

<template>
  <main class="container">
    <NuxtLink to="/products" class="back-link"
      >← Kembali ke daftar produk</NuxtLink
    >

    <div v-if="loading" class="card detail" aria-busy="true">
      <span class="skeleton" style="height: 240px" />
      <div>
        <span
          class="skeleton"
          style="width: 50%; height: 1.5rem; margin-bottom: 1rem"
        />
        <span
          v-for="n in 5"
          :key="n"
          class="skeleton"
          style="margin-bottom: 0.75rem"
        />
      </div>
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
        <div>
          <h1>{{ product.name }}</h1>
          <div class="product-cell" style="margin-top: 0.35rem">
            <span class="mono muted">{{ product.sku }}</span>
            <ProductStatusBadge
              :is-active="product.isActive"
              :archived-at="product.archivedAt"
            />
          </div>
        </div>
        <div class="page-header__actions">
          <template v-if="!product.archivedAt">
            <NuxtLink
              :to="`/products/${product.id}/edit`"
              class="btn btn--primary"
            >
              Edit
            </NuxtLink>
            <button
              type="button"
              class="btn"
              :disabled="busy"
              @click="toggleActive"
            >
              {{ product.isActive ? "Nonaktifkan" : "Aktifkan" }}
            </button>
            <button
              v-if="auth.isAdmin"
              type="button"
              class="btn btn--danger"
              :disabled="busy"
              @click="archive"
            >
              Arsipkan
            </button>
          </template>
          <button
            v-else-if="auth.isAdmin"
            type="button"
            class="btn btn--primary"
            :disabled="busy"
            @click="restore"
          >
            Pulihkan
          </button>
        </div>
      </div>

      <div class="card detail">
        <ProductImage :src="product.imageUrl" :alt="product.name" :size="240" />
        <dl class="detail-list">
          <div>
            <dt>Harga</dt>
            <dd>
              <strong>{{ formatRupiah(product.price) }}</strong>
            </dd>
          </div>
          <div>
            <dt>Stok</dt>
            <dd>{{ formatNumber(product.stock) }}</dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>{{ product.categoryName }}</dd>
          </div>
          <div>
            <dt>Berat</dt>
            <dd>{{ formatWeight(product.weight) }}</dd>
          </div>
          <div>
            <dt>Dimensi (P × L × T)</dt>
            <dd>
              {{
                formatDimensions(product.length, product.width, product.height)
              }}
            </dd>
          </div>
          <div>
            <dt>Diarsipkan</dt>
            <dd>{{ formatDateTime(product.archivedAt) }}</dd>
          </div>
          <div>
            <dt>Dibuat</dt>
            <dd>{{ formatDateTime(product.createdAt) }}</dd>
          </div>
          <div>
            <dt>Terakhir diperbarui</dt>
            <dd>{{ formatDateTime(product.updatedAt) }}</dd>
          </div>
          <div class="span-2">
            <dt>Deskripsi</dt>
            <dd>{{ product.description || "—" }}</dd>
          </div>
        </dl>
      </div>
    </template>
  </main>
</template>
