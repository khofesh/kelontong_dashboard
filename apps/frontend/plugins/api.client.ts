import { createApiClient } from "~/composables/useApi";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const api = createApiClient(config.public.apiBase as string);
  return { provide: { api } };
});
