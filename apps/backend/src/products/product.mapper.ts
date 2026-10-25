import { Category, Product } from "@prisma/client";

export type ProductWithCategory = Product & {
  category: Pick<Category, "id" | "name">;
};

export interface ProductResponse {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  weight: number;
  width: number;
  length: number;
  height: number;
  imageUrl: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toProductResponse(
  product: ProductWithCategory,
): ProductResponse {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    weight: product.weight,
    width: product.width,
    length: product.length,
    height: product.height,
    imageUrl: product.imageUrl,
    price: product.price,
    stock: product.stock,
    isActive: product.isActive,
    archivedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
