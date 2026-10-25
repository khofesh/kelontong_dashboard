<script setup lang="ts">
defineProps<{
  isActive: boolean;
  archivedAt?: string | null;
}>();
</script>

<template>
  <span v-if="archivedAt" class="badge badge--archived">Diarsipkan</span>
  <span v-else-if="isActive" class="badge badge--active">Aktif</span>
  <span v-else class="badge badge--inactive">Nonaktif</span>
</template>
