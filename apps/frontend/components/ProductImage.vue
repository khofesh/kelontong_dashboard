<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt: string;
    size?: number;
  }>(),
  { src: null, size: 48 },
);

const failed = ref(false);
watch(
  () => props.src,
  () => (failed.value = false),
);

const initials = computed(() =>
  props.alt
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join(""),
);
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(12, props.size / 3)}px`,
}));
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt"
    class="product-image"
    :style="style"
    loading="lazy"
    @error="failed = true"
  />
  <div v-else class="product-image" :style="style" aria-hidden="true">
    {{ initials || "?" }}
  </div>
</template>
