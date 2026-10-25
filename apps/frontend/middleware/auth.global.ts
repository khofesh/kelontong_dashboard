import { useAuthStore } from "~/stores/auth";

const GUEST_ONLY = ["/login", "/register"];

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  await auth.fetchMe();

  const guestOnly = GUEST_ONLY.includes(to.path);
  if (!auth.isAuthenticated && !guestOnly) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
  if (auth.isAuthenticated && guestOnly) {
    return navigateTo("/products");
  }
});
