<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { registerSchema } from "~/types/product.schema";
import {
  type FieldErrors,
  apiFieldErrors,
  errorMessage,
  zodFieldErrors,
} from "~/utils/form-errors";

useHead({ title: "Daftar · Kelontong" });

const auth = useAuthStore();
const { show } = useFlash();

const form = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
});
const errors = ref<FieldErrors>({});
const formError = ref<string | null>(null);

async function submit(): Promise<void> {
  formError.value = null;
  const parsed = registerSchema.safeParse(form);
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error);
    return;
  }
  errors.value = {};
  try {
    const { name, email, password } = parsed.data;
    await auth.register({ name, email, password });
    show("success", "Akun berhasil dibuat");
    await navigateTo("/products", { replace: true });
  } catch (err) {
    errors.value = apiFieldErrors(err);
    formError.value = errorMessage(err, "Registrasi gagal, silakan coba lagi");
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="card auth-card">
      <h1>Daftar akun</h1>
      <p class="muted">Akun baru terdaftar sebagai staf.</p>

      <form novalidate @submit.prevent="submit">
        <div v-if="formError" class="alert alert--error" role="alert">
          {{ formError }}
        </div>

        <div class="field">
          <label for="name">Nama</label>
          <input
            id="name"
            v-model="form.name"
            class="input"
            :class="{ 'input--invalid': errors.name }"
            autocomplete="name"
            autofocus
          />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
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
            autocomplete="new-password"
          />
          <span v-if="errors.password" class="field-error">{{
            errors.password
          }}</span>
          <span v-else class="field-hint"
            >Minimal 8 karakter, berisi huruf dan angka.</span
          >
        </div>

        <div class="field">
          <label for="confirmPassword">Konfirmasi password</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            class="input"
            :class="{ 'input--invalid': errors.confirmPassword }"
            autocomplete="new-password"
          />
          <span v-if="errors.confirmPassword" class="field-error">
            {{ errors.confirmPassword }}
          </span>
        </div>

        <button
          type="submit"
          class="btn btn--primary btn--block"
          :disabled="auth.loading"
        >
          <span v-if="auth.loading" class="spinner" />
          Daftar
        </button>
      </form>

      <p class="auth-card__footer muted">
        Sudah punya akun? <NuxtLink to="/login">Masuk</NuxtLink>
      </p>
    </div>
  </main>
</template>
