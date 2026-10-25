<script setup lang="ts">
import type { PaginationMeta } from "~/types/api";
import { PAGE_SIZES } from "~/utils/product-query";

const props = defineProps<{
  meta: PaginationMeta;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:page": [page: number];
  "update:pageSize": [pageSize: number];
}>();

const from = computed(() =>
  props.meta.totalItems === 0
    ? 0
    : (props.meta.page - 1) * props.meta.pageSize + 1,
);
const to = computed(() =>
  Math.min(props.meta.page * props.meta.pageSize, props.meta.totalItems),
);

const pages = computed<(number | "…")[]>(() => {
  const { page, totalPages } = props.meta;
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  const set = new Set<number>([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p += 1) {
    if (p >= 1 && p <= totalPages) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((p, index) => {
    const prev = sorted[index - 1];
    if (prev !== undefined && p - prev > 1) result.push("…");
    result.push(p);
  });
  return result;
});

function go(page: number): void {
  if (page < 1 || page > props.meta.totalPages || page === props.meta.page)
    return;
  emit("update:page", page);
}
</script>

<template>
  <nav class="pagination" aria-label="Pagination">
    <span class="muted">
      Menampilkan {{ from }}–{{ to }} dari {{ meta.totalItems }} produk
    </span>

    <div class="pagination__pages">
      <button
        type="button"
        class="btn btn--sm"
        :disabled="disabled || meta.page <= 1"
        aria-label="Halaman sebelumnya"
        @click="go(meta.page - 1)"
      >
        ‹
      </button>
      <template v-for="(item, index) in pages" :key="`${item}-${index}`">
        <span v-if="item === '…'" class="btn btn--sm" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="btn btn--sm"
          :class="{ 'pagination__page--current': item === meta.page }"
          :aria-current="item === meta.page ? 'page' : undefined"
          :disabled="disabled"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="btn btn--sm"
        :disabled="disabled || meta.page >= meta.totalPages"
        aria-label="Halaman berikutnya"
        @click="go(meta.page + 1)"
      >
        ›
      </button>
    </div>

    <label class="pagination__size">
      <span class="muted">Per halaman</span>
      <select
        class="select"
        :value="meta.pageSize"
        :disabled="disabled"
        @change="
          emit(
            'update:pageSize',
            Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option v-for="size in PAGE_SIZES" :key="size" :value="size">
          {{ size }}
        </option>
      </select>
    </label>
  </nav>
</template>
