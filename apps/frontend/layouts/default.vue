<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { useProductListStore } from "~/stores/productList";

const auth = useAuthStore();
const { message: flash, show, clear } = useFlash();
const loggingOut = ref(false);

async function logout(): Promise<void> {
  loggingOut.value = true;
  try {
    await auth.logout();
  } catch {
    show("error", "Gagal logout di server, sesi lokal tetap dihapus");
  } finally {
    loggingOut.value = false;
    useProductListStore().reset();
    await navigateTo("/login");
  }
}
</script>

<template>
  <div>
    <header v-if="auth.isAuthenticated" class="app-header">
      <div class="app-header__inner">
        <NuxtLink to="/products" class="app-header__brand">Kelontong</NuxtLink>
        <nav class="app-header__nav">
          <NuxtLink to="/products">Produk</NuxtLink>
        </nav>
        <div class="app-header__user">
          <span>{{ auth.displayName }}</span>
          <span class="badge badge--role">{{ auth.user?.role }}</span>
          <button
            type="button"
            class="btn btn--sm"
            :disabled="loggingOut"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <slot />

    <div
      v-if="flash"
      class="alert flash"
      :class="flash.type === 'error' ? 'alert--error' : 'alert--success'"
      role="status"
      @click="clear"
    >
      {{ flash.text }}
    </div>
  </div>
</template>
