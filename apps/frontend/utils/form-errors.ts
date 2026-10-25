import type { ZodError } from "zod";
import { ApiError } from "~/utils/api-client";

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !result[field]) result[field] = issue.message;
  }
  return result;
}

const CODE_FIELDS: Record<string, [field: string, message: string]> = {
  SKU_ALREADY_EXISTS: ["sku", "SKU sudah digunakan oleh produk lain"],
  CATEGORY_NOT_FOUND: ["categoryId", "Kategori tidak ditemukan"],
  EMAIL_ALREADY_REGISTERED: ["email", "Email sudah terdaftar"],
};

/** Maps backend validation details / known error codes onto form fields. */
export function apiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  const result: FieldErrors = {};
  for (const detail of error.details ?? []) {
    if (!result[detail.field]) result[detail.field] = detail.message;
  }
  const mapped = CODE_FIELDS[error.code];
  if (mapped) result[mapped[0]] = mapped[1];
  return result;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
