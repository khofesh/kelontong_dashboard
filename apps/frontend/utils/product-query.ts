import type { LocationQuery } from "vue-router";
import type { ProductListQuery } from "~/types/product";

export const SORT_FIELDS = [
  "name",
  "price",
  "stock",
  "createdAt",
  "updatedAt",
] as const;
export const PAGE_SIZES = [10, 20, 50, 100] as const;

export const defaultProductQuery: Required<
  Pick<
    ProductListQuery,
    "page" | "pageSize" | "archived" | "sortBy" | "sortOrder"
  >
> = {
  page: 1,
  pageSize: 20,
  archived: "exclude",
  sortBy: "createdAt",
  sortOrder: "desc",
};

function first(value: unknown): string | undefined {
  if (Array.isArray(value))
    return value[0] == null ? undefined : String(value[0]);
  if (value == null) return undefined;
  return String(value);
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads the list state from the URL. Invalid values fall back to defaults. */
export function queryFromRoute(
  raw: LocationQuery | Record<string, unknown>,
): Required<
  Pick<
    ProductListQuery,
    "page" | "pageSize" | "archived" | "sortBy" | "sortOrder"
  >
> &
  Pick<ProductListQuery, "q" | "categoryId" | "isActive"> {
  const q = first(raw.q)?.trim() || undefined;
  const categoryIdRaw = Number(first(raw.categoryId));
  const isActiveRaw = first(raw.isActive);
  const archivedRaw = first(raw.archived);
  const sortByRaw = first(raw.sortBy);
  const sortOrderRaw = first(raw.sortOrder);
  const pageSize = toPositiveInt(raw.pageSize, defaultProductQuery.pageSize);

  return {
    page: toPositiveInt(raw.page, 1),
    pageSize: PAGE_SIZES.includes(pageSize as (typeof PAGE_SIZES)[number])
      ? pageSize
      : defaultProductQuery.pageSize,
    q,
    categoryId:
      Number.isInteger(categoryIdRaw) && categoryIdRaw > 0
        ? categoryIdRaw
        : undefined,
    isActive:
      isActiveRaw === "true"
        ? true
        : isActiveRaw === "false"
          ? false
          : undefined,
    archived:
      archivedRaw === "only" || archivedRaw === "include"
        ? archivedRaw
        : "exclude",
    sortBy: SORT_FIELDS.includes(sortByRaw as (typeof SORT_FIELDS)[number])
      ? (sortByRaw as (typeof SORT_FIELDS)[number])
      : defaultProductQuery.sortBy,
    sortOrder: sortOrderRaw === "asc" ? "asc" : defaultProductQuery.sortOrder,
  };
}

/** Serialises only non-default values so URLs stay short and shareable. */
export function queryToRoute(
  query: ProductListQuery & { page?: number; pageSize?: number },
): Record<string, string> {
  const result: Record<string, string> = {};
  if (query.q) result.q = query.q;
  if (query.categoryId) result.categoryId = String(query.categoryId);
  if (query.isActive !== undefined && query.isActive !== null) {
    result.isActive = String(query.isActive);
  }
  if (query.archived && query.archived !== "exclude")
    result.archived = query.archived;
  if (query.sortBy && query.sortBy !== defaultProductQuery.sortBy)
    result.sortBy = query.sortBy;
  if (query.sortOrder && query.sortOrder !== defaultProductQuery.sortOrder) {
    result.sortOrder = query.sortOrder;
  }
  if (query.page && query.page > 1) result.page = String(query.page);
  if (query.pageSize && query.pageSize !== defaultProductQuery.pageSize) {
    result.pageSize = String(query.pageSize);
  }
  return result;
}

export function hasActiveFilters(query: ProductListQuery): boolean {
  return Boolean(
    query.q ||
    query.categoryId ||
    query.isActive !== undefined ||
    (query.archived && query.archived !== "exclude"),
  );
}
