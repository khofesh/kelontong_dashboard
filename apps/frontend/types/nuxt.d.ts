import type { HttpClient } from "~/utils/api-client";

declare module "#app" {
  interface NuxtApp {
    $api: HttpClient;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $api: HttpClient;
  }
}

export {};
