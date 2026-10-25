import { useApi } from "~/composables/useApi";
import type { Category } from "~/types/api";

export const categoryService = {
  async list(): Promise<Category[]> {
    const { data } = await useApi().get<Category[]>("/categories");
    return data;
  },
};
