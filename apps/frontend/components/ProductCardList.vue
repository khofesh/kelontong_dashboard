<script setup lang="ts">
import type { Product } from "~/types/product";
import { formatNumber, formatRupiah } from "~/utils/formatters";

defineProps<{
  items: Product[];
  canArchive: boolean;
  busyId?: number | null;
}>();

defineEmits<{
  toggleActive: [product: Product];
  archive: [product: Product];
  restore: [product: Product];
}>();
</script>

<template>
  <ul class="card-list" role="list" style="padding: 0; margin: 0">
    <li v-for="product in items" :key="product.id" class="card product-card">
      <ProductImage :src="product.imageUrl" :alt="product.name" :size="56" />
      <div class="product-card__body">
        <NuxtLink :to="`/products/${product.id}`">
          <strong>{{ product.name }}</strong>
        </NuxtLink>
        <div class="muted mono">{{ product.sku }}</div>
        <div class="product-card__meta">
          <span>{{ formatRupiah(product.price) }}</span>
          <span class="muted">Stok {{ formatNumber(product.stock) }}</span>
          <span class="muted">{{ product.categoryName }}</span>
          <ProductStatusBadge
            :is-active="product.isActive"
            :archived-at="product.archivedAt"
          />
        </div>
        <div class="row-actions" style="justify-content: flex-start">
          <template v-if="!product.archivedAt">
            <NuxtLink :to="`/products/${product.id}/edit`" class="btn btn--sm">
              Edit
            </NuxtLink>
            <button
              type="button"
              class="btn btn--sm"
              :disabled="busyId === product.id"
              @click="$emit('toggleActive', product)"
            >
              {{ product.isActive ? "Nonaktifkan" : "Aktifkan" }}
            </button>
            <button
              v-if="canArchive"
              type="button"
              class="btn btn--sm btn--danger"
              :disabled="busyId === product.id"
              @click="$emit('archive', product)"
            >
              Arsipkan
            </button>
          </template>
          <button
            v-else-if="canArchive"
            type="button"
            class="btn btn--sm"
            :disabled="busyId === product.id"
            @click="$emit('restore', product)"
          >
            Pulihkan
          </button>
        </div>
      </div>
    </li>
  </ul>
</template>
