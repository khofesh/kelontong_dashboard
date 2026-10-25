import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export const SORT_FIELDS = [
  "name",
  "price",
  "stock",
  "createdAt",
  "updatedAt",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export const ARCHIVED_FILTERS = ["exclude", "only", "include"] as const;
export type ArchivedFilter = (typeof ARCHIVED_FILTERS)[number];

function toBoolean({ value }: { value: unknown }) {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Case-insensitive search on name or SKU",
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ type: Boolean })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ARCHIVED_FILTERS, default: "exclude" })
  @IsOptional()
  @IsIn(ARCHIVED_FILTERS)
  archived: ArchivedFilter = "exclude";

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: "createdAt" })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy: SortField = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}
