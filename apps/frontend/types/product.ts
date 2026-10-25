export interface Product {
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

export interface ProductInput {
  sku: string;
  name: string;
  description?: string | null;
  categoryId: number;
  weight: number;
  width: number;
  length: number;
  height: number;
  imageUrl?: string | null;
  price: number;
  stock?: number;
  isActive?: boolean;
}

export interface ProductListQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryId?: number;
  isActive?: boolean;
  archived?: "exclude" | "only" | "include";
  sortBy?: "name" | "price" | "stock" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}
