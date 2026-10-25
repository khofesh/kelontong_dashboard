import type { HttpClient } from "~/utils/api-client";
import { createHttp } from "~/utils/api-client";

const GUEST_PATHS = ["/login", "/register"];

export function createApiClient(baseUrl: string): HttpClient {
  return createHttp($fetch as never, baseUrl, {
    onAuthFailure: () => {
      if (
        import.meta.client &&
        !GUEST_PATHS.includes(window.location.pathname)
      ) {
        const current = `${window.location.pathname}${window.location.search}`;
        window.location.assign(
          `/login?redirect=${encodeURIComponent(current)}`,
        );
      }
    },
  });
}

export function useApi(): HttpClient {
  return useNuxtApp().$api;
}
