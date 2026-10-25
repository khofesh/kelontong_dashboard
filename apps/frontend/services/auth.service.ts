import { useApi } from "~/composables/useApi";
import type { User } from "~/types/auth";

export const authService = {
  async login(input: { email: string; password: string }): Promise<User> {
    const { data } = await useApi().post<User>("/auth/login", input);
    return data;
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const { data } = await useApi().post<User>("/auth/register", input);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await useApi().get<User>("/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    await useApi().post("/auth/logout");
  },
};
