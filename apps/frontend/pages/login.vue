<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { loginSchema } from "~/types/product.schema";
import {
  type FieldErrors,
  apiFieldErrors,
  errorMessage,
  zodFieldErrors,
} from "~/utils/form-errors";

useHead({ title: "Login · Kelontong" });

const auth = useAuthStore();
const route = useRoute();

const form = reactive({ email: "", password: "" });
const errors = ref<FieldErrors>({});
const formError = ref<string | null>(null);

function redirectTarget(): string {
  const raw = route.query.redirect;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/products";
}

async function submit(): Promise<void> {
  formError.value = null;
  const parsed = loginSchema.safeParse(form);
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error);
    return;
  }
  errors.value = {};
  try {
    await auth.login(parsed.data);
    await navigateTo(redirectTarget(), { replace: true });
  } catch (err) {
    errors.value = apiFieldErrors(err);
    formError.value = errorMessage(err, "Login gagal, silakan coba lagi");
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="card auth-card">
      <h1>Masuk</h1>
      <p class="muted">Kelola produk toko kelontong Anda.</p>

      <form novalidate @submit.prevent="submit">
        <div v-if="formError" class="alert alert--error" role="alert">
          {{ formError }}
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="input"
            :class="{ 'input--invalid': errors.email }"
            autocomplete="email"
            autofocus
          />
          <span v-if="errors.email" class="field-error">{{
            errors.email
          }}</span>
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="input"
            :class="{ 'input--invalid': errors.password }"
            autocomplete="current-password"
          />
          <span v-if="errors.password" class="field-error">{{
            errors.password
          }}</span>
        </div>

        <button
          type="submit"
          class="btn btn--primary btn--block"
          :disabled="auth.loading"
        >
          <span v-if="auth.loading" class="spinner" />
          Masuk
        </button>
      </form>

      <p class="auth-card__footer muted">
        Belum punya akun? <NuxtLink to="/register">Daftar</NuxtLink>
      </p>
    </div>
  </main>
</template>
