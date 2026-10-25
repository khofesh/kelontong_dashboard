<script setup lang="ts">
import type { Product, ProductInput } from "~/types/product";
import { productSchema } from "~/types/product.schema";
import { type FieldErrors, zodFieldErrors } from "~/utils/form-errors";

const props = withDefaults(
  defineProps<{
    initial?: Product | null;
    submitting?: boolean;
    submitLabel?: string;
    serverErrors?: FieldErrors;
  }>(),
  {
    initial: null,
    submitting: false,
    submitLabel: "Simpan",
    serverErrors: () => ({}),
  },
);

const emit = defineEmits<{
  submit: [values: ProductInput];
  cancel: [];
}>();

const {
  categories,
  loading: categoriesLoading,
  error: categoriesError,
  load,
} = useCategories();
onMounted(() => load());

type NumberField = number | "";

const form = reactive({
  sku: props.initial?.sku ?? "",
  name: props.initial?.name ?? "",
  description: props.initial?.description ?? "",
  categoryId: (props.initial?.categoryId ?? "") as NumberField,
  weight: (props.initial?.weight ?? "") as NumberField,
  width: (props.initial?.width ?? "") as NumberField,
  length: (props.initial?.length ?? "") as NumberField,
  height: (props.initial?.height ?? "") as NumberField,
  imageUrl: props.initial?.imageUrl ?? "",
  price: (props.initial?.price ?? "") as NumberField,
  stock: (props.initial?.stock ?? 0) as NumberField,
  isActive: props.initial?.isActive ?? true,
});

const localErrors = ref<FieldErrors>({});
const errors = computed<FieldErrors>(() => ({
  ...props.serverErrors,
  ...localErrors.value,
}));

function submit(): void {
  const result = productSchema.safeParse(form);
  if (!result.success) {
    localErrors.value = zodFieldErrors(result.error);
    return;
  }
  localErrors.value = {};
  emit("submit", result.data as ProductInput);
}
</script>

<template>
  <form class="card" novalidate @submit.prevent="submit">
    <section class="form-section">
      <h2>Informasi produk</h2>
      <div class="form-grid">
        <div class="field">
          <label for="sku">SKU</label>
          <input
            id="sku"
            v-model="form.sku"
            class="input mono"
            :class="{ 'input--invalid': errors.sku }"
            maxlength="32"
            autocomplete="off"
            placeholder="MIE-GRG-001"
          />
          <span v-if="errors.sku" class="field-error">{{ errors.sku }}</span>
          <span v-else class="field-hint"
            >Huruf, angka, dan tanda hubung. Harus unik.</span
          >
        </div>

        <div class="field">
          <label for="categoryId">Kategori</label>
          <select
            id="categoryId"
            v-model.number="form.categoryId"
            class="select"
            :class="{ 'input--invalid': errors.categoryId }"
            :disabled="categoriesLoading"
          >
            <option value="">
              {{ categoriesLoading ? "Memuat kategori…" : "Pilih kategori" }}
            </option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
          <span v-if="errors.categoryId" class="field-error">{{
            errors.categoryId
          }}</span>
          <span v-else-if="categoriesError" class="field-error">
            Gagal memuat kategori.
            <a href="#" @click.prevent="load(true)">Coba lagi</a>
          </span>
        </div>

        <div class="field span-2">
          <label for="name">Nama produk</label>
          <input
            id="name"
            v-model="form.name"
            class="input"
            :class="{ 'input--invalid': errors.name }"
            maxlength="120"
          />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>

        <div class="field span-2">
          <label for="description"
            >Deskripsi <span class="muted">(opsional)</span></label
          >
          <textarea
            id="description"
            v-model="form.description"
            class="textarea"
            :class="{ 'input--invalid': errors.description }"
            maxlength="2000"
          />
          <span v-if="errors.description" class="field-error">{{
            errors.description
          }}</span>
        </div>
      </div>
    </section>

    <section class="form-section">
      <h2>Harga &amp; stok</h2>
      <div class="form-grid">
        <div class="field">
          <label for="price">Harga (Rp)</label>
          <input
            id="price"
            v-model="form.price"
            type="number"
            min="0"
            step="1"
            class="input"
            :class="{ 'input--invalid': errors.price }"
          />
          <span v-if="errors.price" class="field-error">{{
            errors.price
          }}</span>
        </div>
        <div class="field">
          <label for="stock">Stok</label>
          <input
            id="stock"
            v-model="form.stock"
            type="number"
            min="0"
            step="1"
            class="input"
            :class="{ 'input--invalid': errors.stock }"
          />
          <span v-if="errors.stock" class="field-error">{{
            errors.stock
          }}</span>
        </div>
        <label class="checkbox span-2">
          <input v-model="form.isActive" type="checkbox" />
          Produk aktif (ditampilkan untuk dijual)
        </label>
      </div>
    </section>

    <section class="form-section">
      <h2>Berat &amp; dimensi</h2>
      <div class="form-grid form-grid--4">
        <div class="field">
          <label for="weight">Berat (gram)</label>
          <input
            id="weight"
            v-model="form.weight"
            type="number"
            min="1"
            class="input"
            :class="{ 'input--invalid': errors.weight }"
          />
          <span v-if="errors.weight" class="field-error">{{
            errors.weight
          }}</span>
        </div>
        <div class="field">
          <label for="length">Panjang (cm)</label>
          <input
            id="length"
            v-model="form.length"
            type="number"
            min="1"
            class="input"
            :class="{ 'input--invalid': errors.length }"
          />
          <span v-if="errors.length" class="field-error">{{
            errors.length
          }}</span>
        </div>
        <div class="field">
          <label for="width">Lebar (cm)</label>
          <input
            id="width"
            v-model="form.width"
            type="number"
            min="1"
            class="input"
            :class="{ 'input--invalid': errors.width }"
          />
          <span v-if="errors.width" class="field-error">{{
            errors.width
          }}</span>
        </div>
        <div class="field">
          <label for="height">Tinggi (cm)</label>
          <input
            id="height"
            v-model="form.height"
            type="number"
            min="1"
            class="input"
            :class="{ 'input--invalid': errors.height }"
          />
          <span v-if="errors.height" class="field-error">{{
            errors.height
          }}</span>
        </div>
      </div>
    </section>

    <section class="form-section">
      <h2>Gambar</h2>
      <div class="product-cell">
        <ProductImage
          :src="form.imageUrl || null"
          :alt="form.name || 'Produk'"
          :size="64"
        />
        <div class="field" style="flex: 1">
          <label for="imageUrl"
            >URL gambar <span class="muted">(opsional)</span></label
          >
          <input
            id="imageUrl"
            v-model="form.imageUrl"
            type="url"
            class="input"
            :class="{ 'input--invalid': errors.imageUrl }"
            placeholder="https://…"
          />
          <span v-if="errors.imageUrl" class="field-error">{{
            errors.imageUrl
          }}</span>
        </div>
      </div>
    </section>

    <div class="form-actions">
      <button
        type="button"
        class="btn"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Batal
      </button>
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        <span v-if="submitting" class="spinner" />
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>
