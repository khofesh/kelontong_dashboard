// https://nuxt.com/docs/api/configuration/nuxt-config
const apiProxyTarget =
  process.env.NUXT_API_PROXY_TARGET ?? "http://localhost:3001";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  ssr: false,

  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "Kelontong Dashboard",
      htmlAttrs: { lang: "id" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: "/api/v1",
    },
  },

  routeRules: {
    "/api/**": { proxy: `${apiProxyTarget}/api/**` },
  },
});
