<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string | null;
    retrying?: boolean;
  }>(),
  { title: "Terjadi kesalahan", message: null, retrying: false },
);

defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="state state--error" role="alert">
    <div class="state__icon" aria-hidden="true">⚠️</div>
    <h2>{{ title }}</h2>
    <p>{{ message ?? "Silakan coba lagi beberapa saat lagi." }}</p>
    <slot>
      <button
        type="button"
        class="btn"
        :disabled="retrying"
        @click="$emit('retry')"
      >
        <span v-if="retrying" class="spinner" />
        Coba lagi
      </button>
    </slot>
  </div>
</template>
