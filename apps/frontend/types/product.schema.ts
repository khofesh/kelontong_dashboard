import { z } from "zod";

function requiredInt(label: string, min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? undefined
        : Number(value),
    z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? `${label} wajib diisi`
            : `${label} harus berupa angka`,
      })
      .int(`${label} harus bilangan bulat`)
      .min(min, `${label} minimal ${min}`)
      .max(max, `${label} maksimal ${max}`),
  );
}

function stockValue() {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? 0 : Number(value),
    z
      .number({ error: "Stok harus berupa angka" })
      .int("Stok harus bilangan bulat")
      .min(0, "Stok tidak boleh negatif")
      .max(1_000_000, "Stok maksimal 1.000.000"),
  );
}

// Empty input becomes null (not undefined) so clearing the field on edit
// is sent to the API instead of being dropped from the JSON body.
const optionalDescription = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.string().trim().max(2000, "Deskripsi maksimal 2000 karakter").nullable(),
);

const optionalImageUrl = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z
    .string()
    .trim()
    .max(2048, "URL gambar maksimal 2048 karakter")
    .url("URL gambar tidak valid")
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "URL harus diawali http:// atau https://",
    )
    .nullable(),
);

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3, "SKU minimal 3 karakter")
    .max(32, "SKU maksimal 32 karakter")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "SKU hanya boleh berisi huruf, angka, dan tanda hubung",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Nama produk minimal 2 karakter")
    .max(120, "Nama produk maksimal 120 karakter"),
  description: optionalDescription,
  categoryId: requiredInt("Kategori", 1, Number.MAX_SAFE_INTEGER),
  weight: requiredInt("Berat", 1, 1_000_000),
  width: requiredInt("Lebar", 1, 10_000),
  length: requiredInt("Panjang", 1, 10_000),
  height: requiredInt("Tinggi", 1, 10_000),
  imageUrl: optionalImageUrl,
  price: requiredInt("Harga", 0, 1_000_000_000),
  stock: stockValue(),
  isActive: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter")
      .max(80, "Nama maksimal 80 karakter"),
    email: z
      .string()
      .trim()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf")
      .regex(/\d/, "Password harus mengandung angka"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
