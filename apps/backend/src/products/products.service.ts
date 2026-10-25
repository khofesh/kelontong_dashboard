import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { buildPaginationMeta } from "../common/dto/pagination-query.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductResponse, toProductResponse } from "./product.mapper";

const categorySelect = { select: { id: true, name: true } } as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListProductsQueryDto, user: AuthUser) {
    if (query.archived !== "exclude" && user.role !== Role.ADMIN) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Only admins can view archived products",
      });
    }

    const where = this.buildWhere(query);
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      {
        [query.sortBy]: query.sortOrder,
      } as Prisma.ProductOrderByWithRelationInput,
      { id: query.sortOrder },
    ];
    const skip = (query.page - 1) * query.pageSize;

    const [totalItems, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: { category: categorySelect },
      }),
    ]);

    return {
      data: products.map(toProductResponse),
      meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
    };
  }

  async findOne(id: number, user: AuthUser): Promise<ProductResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: categorySelect },
    });
    if (!product || (product.deletedAt && user.role !== Role.ADMIN)) {
      throw this.notFound();
    }
    return toProductResponse(product);
  }

  async create(
    dto: CreateProductDto,
    user: AuthUser,
  ): Promise<ProductResponse> {
    await this.assertCategoryExists(dto.categoryId);
    try {
      const product = await this.prisma.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          description: dto.description ?? null,
          categoryId: dto.categoryId,
          weight: dto.weight,
          width: dto.width,
          length: dto.length,
          height: dto.height,
          imageUrl: dto.imageUrl ?? null,
          price: dto.price,
          stock: dto.stock ?? 0,
          isActive: dto.isActive ?? true,
          createdById: user.id,
          updatedById: user.id,
        },
        include: { category: categorySelect },
      });
      return toProductResponse(product);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    user: AuthUser,
  ): Promise<ProductResponse> {
    this.assertNoNulls(dto);
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || (existing.deletedAt && user.role !== Role.ADMIN)) {
      throw this.notFound();
    }
    if (dto.categoryId !== undefined) {
      await this.assertCategoryExists(dto.categoryId);
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          sku: dto.sku,
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          weight: dto.weight,
          width: dto.width,
          length: dto.length,
          height: dto.height,
          imageUrl: dto.imageUrl,
          price: dto.price,
          stock: dto.stock,
          isActive: dto.isActive,
          updatedById: user.id,
        },
        include: { category: categorySelect },
      });
      return toProductResponse(product);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async archive(id: number, user: AuthUser): Promise<void> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw this.notFound();
    if (existing.deletedAt) return;

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.id },
    });
  }

  async restore(id: number, user: AuthUser): Promise<ProductResponse> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw this.notFound();

    const product = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: null, updatedById: user.id },
      include: { category: categorySelect },
    });
    return toProductResponse(product);
  }

  buildWhere(query: ListProductsQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    if (query.archived === "exclude") where.deletedAt = null;
    if (query.archived === "only") where.deletedAt = { not: null };
    if (query.categoryId !== undefined) where.categoryId = query.categoryId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { sku: { contains: query.q, mode: "insensitive" } },
      ];
    }
    return where;
  }

  private async assertCategoryExists(categoryId: number): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new UnprocessableEntityException({
        code: "CATEGORY_NOT_FOUND",
        message: "The selected category does not exist",
      });
    }
  }

  private assertNoNulls(dto: UpdateProductDto): void {
    const nullable = new Set(["description", "imageUrl"]);
    const invalid = Object.entries(dto)
      .filter(([key, value]) => value === null && !nullable.has(key))
      .map(([field]) => ({ field, message: `${field} cannot be null` }));

    if (invalid.length > 0) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: invalid,
      });
    }
  }

  private mapWriteError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException({
        code: "SKU_ALREADY_EXISTS",
        message: "A product with this SKU already exists",
      });
    }
    return error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: "PRODUCT_NOT_FOUND",
      message: "Product not found",
    });
  }
}
