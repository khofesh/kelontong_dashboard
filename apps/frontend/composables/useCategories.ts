import { categoryService } from "~/services/category.service";
import type { Category } from "~/types/api";

export function useCategories() {
  const categories = useState<Category[]>("categories", () => []);
  const loading = useState<boolean>("categories-loading", () => false);
  const loaded = useState<boolean>("categories-loaded", () => false);
  const error = useState<string | null>("categories-error", () => null);

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return;
    loading.value = true;
    error.value = null;
    try {
      categories.value = await categoryService.list();
      loaded.value = true;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  return { categories, loading, loaded, error, load };
}
