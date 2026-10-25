<script setup lang="ts">
import { productService } from "~/services/product.service";
import { useAuthStore } from "~/stores/auth";
import {
  type ProductListState,
  useProductListStore,
} from "~/stores/productList";
import type { Product, ProductListQuery } from "~/types/product";
import { errorMessage } from "~/utils/form-errors";
import {
  defaultProductQuery,
  hasActiveFilters,
  queryFromRoute,
  queryToRoute,
} from "~/utils/product-query";

useHead({ title: "Produk · Kelontong" });

type SortField = NonNullable<ProductListQuery["sortBy"]>;

const SORT_OPTIONS: {
  value: `${SortField}:${"asc" | "desc"}`;
  label: string;
}[] = [
  { value: "createdAt:desc", label: "Terbaru ditambahkan" },
  { value: "createdAt:asc", label: "Terlama ditambahkan" },
  { value: "updatedAt:desc", label: "Terakhir diperbarui" },
  { value: "name:asc", label: "Nama A–Z" },
  { value: "name:desc", label: "Nama Z–A" },
  { value: "price:asc", label: "Harga termurah" },
  { value: "price:desc", label: "Harga termahal" },
  { value: "stock:asc", label: "Stok paling sedikit" },
  { value: "stock:desc", label: "Stok paling banyak" },
];

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const store = useProductListStore();
const { categories, load: loadCategories } = useCategories();
const { show } = useFlash();

const search = ref("");
const busyId = ref<number | null>(null);
const filtered = computed(() => hasActiveFilters(store.query));
const sortValue = computed(
  () => `${store.query.sortBy}:${store.query.sortOrder}`,
);

onMounted(() => loadCategories());

watch(
  () => route.query,
  async (raw) => {
    const next = queryFromRoute(raw);
    if (!auth.isAdmin) next.archived = "exclude";
    store.setQuery(next);
    if ((search.value.trim() || undefined) !== next.q)
      search.value = next.q ?? "";

    await store.fetchProducts();
    const { totalPages } = store.meta;
    if (!store.error && totalPages > 0 && next.page > totalPages) {
      update({ page: totalPages }, false);
    }
  },
  { immediate: true },
);

function update(patch: Partial<ProductListState>, resetPage = true): void {
  const next = { ...store.query, ...(resetPage ? { page: 1 } : {}), ...patch };
  router.push({ query: queryToRoute(next) });
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = value.trim() || undefined;
    if (q !== store.query.q) update({ q });
  }, 350);
});
onBeforeUnmount(() => clearTimeout(searchTimer));

function onSelect(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}

function onCategory(event: Event): void {
  const value = onSelect(event);
  update({ categoryId: value ? Number(value) : undefined });
}

function onStatus(event: Event): void {
  const value = onSelect(event);
  update({ isActive: value === "" ? undefined : value === "true" });
}

function onArchived(event: Event): void {
  update({ archived: onSelect(event) as ProductListState["archived"] });
}

function onSortSelect(event: Event): void {
  const [sortBy, sortOrder] = onSelect(event).split(":") as [
    SortField,
    "asc" | "desc",
  ];
  update({ sortBy, sortOrder });
}

function onSortColumn(field: SortField): void {
  const sortOrder =
    store.query.sortBy === field
      ? store.query.sortOrder === "asc"
        ? "desc"
        : "asc"
      : "asc";
  update({ sortBy: field, sortOrder });
}

function resetFilters(): void {
  search.value = "";
  router.push({
    query: queryToRoute({
      ...defaultProductQuery,
      sortBy: store.query.sortBy,
      sortOrder: store.query.sortOrder,
      pageSize: store.query.pageSize,
    }),
  });
}

async function toggleActive(product: Product): Promise<void> {
  busyId.value = product.id;
  try {
    const updated = await store.toggleActive(product);
    show(
      "success",
      `${updated.name} ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`,
    );
  } catch (err) {
    show("error", errorMessage(err, "Gagal mengubah status produk"));
  } finally {
    busyId.value = null;
  }
}

async function archive(product: Product): Promise<void> {
  if (!window.confirm(`Arsipkan produk "${product.name}"?`)) return;
  busyId.value = product.id;
  try {
    await productService.archive(product.id);
    show("success", `${product.name} diarsipkan`);
    await store.fetchProducts();
  } catch (err) {
    show("error", errorMessage(err, "Gagal mengarsipkan produk"));
  } finally {
    busyId.value = null;
  }
}

async function restore(product: Product): Promise<void> {
  busyId.value = product.id;
  try {
    await productService.restore(product.id);
    show("success", `${product.name} dipulihkan`);
    await store.fetchProducts();
  } catch (err) {
    show("error", errorMessage(err, "Gagal memulihkan produk"));
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <main class="container">
    <div class="page-header">
      <div>
        <h1>Produk</h1>
        <p class="muted" style="margin: 0">Kelola katalog produk toko.</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/products/new" class="btn btn--primary">
          + Tambah produk
        </NuxtLink>
      </div>
    </div>

    <div class="toolbar" role="search">
      <input
        v-model="search"
        type="search"
        class="input"
        placeholder="Cari nama atau SKU…"
        aria-label="Cari produk"
        maxlength="100"
      />
      <select
        class="select"
        aria-label="Filter kategori"
        :value="store.query.categoryId ?? ''"
        @change="onCategory"
      >
        <option value="">Semua kategori</option>
        <option
          v-for="category in categories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option>
      </select>
      <select
        class="select"
        aria-label="Filter status"
        :value="
          store.query.isActive === undefined ? '' : String(store.query.isActive)
        "
        @change="onStatus"
      >
        <option value="">Semua status</option>
        <option value="true">Aktif</option>
        <option value="false">Nonaktif</option>
      </select>
      <select
        v-if="auth.isAdmin"
        class="select"
        aria-label="Filter arsip"
        :value="store.query.archived"
        @change="onArchived"
      >
        <option value="exclude">Tanpa arsip</option>
        <option value="only">Hanya arsip</option>
        <option value="include">Termasuk arsip</option>
      </select>
      <select
        class="select"
        aria-label="Urutkan"
        :value="sortValue"
        @change="onSortSelect"
      >
        <option
          v-for="option in SORT_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <div v-if="store.hasLoaded && !store.error" class="toolbar__summary">
      <span class="muted">
        {{ store.totalItems }} produk
        <template v-if="filtered">sesuai filter</template>
      </span>
      <span v-if="store.loading" class="muted"><span class="spinner" /> Memuat…</span>
      <button
        v-else-if="filtered"
        type="button"
        class="btn btn--sm"
        @click="resetFilters"
      >
        Reset filter
      </button>
    </div>

    <!-- Error -->
    <ErrorState
      v-if="store.error"
      title="Gagal memuat produk"
      :message="store.error"
      :retrying="store.loading"
      @retry="store.fetchProducts()"
    />

    <!-- Initial loading -->
    <template v-else-if="!store.hasLoaded">
      <div class="table-wrap" aria-busy="true">
        <table class="table">
          <tbody>
            <tr v-for="n in 8" :key="n">
              <td style="width: 40%"><span class="skeleton" /></td>
              <td><span class="skeleton" /></td>
              <td><span class="skeleton" /></td>
              <td><span class="skeleton" /></td>
              <td><span class="skeleton" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-list" aria-busy="true">
        <div v-for="n in 4" :key="n" class="card">
          <span class="skeleton" />
        </div>
      </div>
    </template>

    <!-- Empty -->
    <EmptyState
      v-else-if="store.items.length === 0"
      :title="filtered ? 'Tidak ada produk yang cocok' : 'Belum ada produk'"
      :description="
        filtered
          ? 'Coba ubah kata kunci pencarian atau filter.'
          : 'Tambahkan produk pertama Anda untuk mulai mengelola katalog.'
      "
    >
      <button v-if="filtered" type="button" class="btn" @click="resetFilters">
        Reset filter
      </button>
      <NuxtLink v-else to="/products/new" class="btn btn--primary">
        + Tambah produk
      </NuxtLink>
    </EmptyState>

    <!-- Data -->
    <template v-else>
      <div
        class="table-wrap"
        :class="{ 'is-refreshing': store.loading }"
        :aria-busy="store.loading"
      >
        <ProductTable
          :items="store.items"
          :sort-by="store.query.sortBy"
          :sort-order="store.query.sortOrder"
          :can-archive="auth.isAdmin"
          :busy-id="busyId"
          @sort="onSortColumn"
          @toggle-active="toggleActive"
          @archive="archive"
          @restore="restore"
        />
      </div>
      <ProductCardList
        :class="{ 'is-refreshing': store.loading }"
        :items="store.items"
        :can-archive="auth.isAdmin"
        :busy-id="busyId"
        @toggle-active="toggleActive"
        @archive="archive"
        @restore="restore"
      />
      <ListPagination
        :meta="store.meta"
        :disabled="store.loading"
        @update:page="(page) => update({ page }, false)"
        @update:page-size="(pageSize) => update({ pageSize })"
      />
    </template>
  </main>
</template>
