import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authService } from "~/services/auth.service";
import type { LoginInput, RegisterInput, User } from "~/types/auth";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let fetchPromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === "ADMIN");
  const displayName = computed(() => user.value?.name ?? "");

  async function fetchMe(): Promise<void> {
    if (initialized.value) return;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
      try {
        user.value = await authService.me();
      } catch {
        user.value = null;
      } finally {
        initialized.value = true;
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }

  async function login(input: LoginInput): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      user.value = await authService.login(input);
      initialized.value = true;
      return user.value;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(input: RegisterInput): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      user.value = await authService.register(input);
      initialized.value = true;
      return user.value;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }

  function clearSession(): void {
    user.value = null;
    initialized.value = true;
    error.value = null;
  }

  return {
    user,
    initialized,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    displayName,
    fetchMe,
    login,
    register,
    logout,
    clearSession,
  };
});
