<script setup lang="ts">
import type { Product, ProductListQuery } from "~/types/product";
import { formatNumber, formatRupiah } from "~/utils/formatters";

type SortField = NonNullable<ProductListQuery["sortBy"]>;

const props = defineProps<{
  items: Product[];
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  canArchive: boolean;
  busyId?: number | null;
}>();

defineEmits<{
  sort: [field: SortField];
  toggleActive: [product: Product];
  archive: [product: Product];
  restore: [product: Product];
}>();

function ariaSort(field: SortField): "ascending" | "descending" | "none" {
  if (props.sortBy !== field) return "none";
  return props.sortOrder === "asc" ? "ascending" : "descending";
}

function indicator(field: SortField): string {
  if (props.sortBy !== field) return "↕";
  return props.sortOrder === "asc" ? "▲" : "▼";
}
</script>

<template>
  <table class="table">
    <thead>
      <tr>
        <th :aria-sort="ariaSort('name')">
          <button
            type="button"
            class="sort-btn"
            :class="{ 'sort-btn--active': sortBy === 'name' }"
            @click="$emit('sort', 'name')"
          >
            Produk {{ indicator("name") }}
          </button>
        </th>
        <th>Kategori</th>
        <th class="num" :aria-sort="ariaSort('price')">
          <button
            type="button"
            class="sort-btn"
            :class="{ 'sort-btn--active': sortBy === 'price' }"
            @click="$emit('sort', 'price')"
          >
            Harga {{ indicator("price") }}
          </button>
        </th>
        <th class="num" :aria-sort="ariaSort('stock')">
          <button
            type="button"
            class="sort-btn"
            :class="{ 'sort-btn--active': sortBy === 'stock' }"
            @click="$emit('sort', 'stock')"
          >
            Stok {{ indicator("stock") }}
          </button>
        </th>
        <th>Status</th>
        <th class="num">Aksi</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="product in items"
        :key="product.id"
        :class="{ 'row--archived': product.archivedAt }"
      >
        <td>
          <div class="product-cell">
            <ProductImage
              :src="product.imageUrl"
              :alt="product.name"
              :size="40"
            />
            <div>
              <NuxtLink :to="`/products/${product.id}`">
                {{
                  product.name
                }}
              </NuxtLink>
              <div class="muted mono">{{ product.sku }}</div>
            </div>
          </div>
        </td>
        <td>{{ product.categoryName }}</td>
        <td class="num">{{ formatRupiah(product.price) }}</td>
        <td class="num">{{ formatNumber(product.stock) }}</td>
        <td>
          <ProductStatusBadge
            :is-active="product.isActive"
            :archived-at="product.archivedAt"
          />
        </td>
        <td>
          <div class="row-actions">
            <template v-if="!product.archivedAt">
              <NuxtLink
                :to="`/products/${product.id}/edit`"
                class="btn btn--sm"
              >
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
        </td>
      </tr>
    </tbody>
  </table>
</template>
