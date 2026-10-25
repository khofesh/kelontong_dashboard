import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const trimUpper = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class CreateProductDto {
  @ApiProperty({ example: "MHZVTK", minLength: 3, maxLength: 32 })
  @Transform(trimUpper)
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Z0-9-]+$/, {
    message: "sku may only contain letters, digits and dashes",
  })
  sku!: string;

  @ApiProperty({ example: "Ciki Ciki", minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: "A popular snack sold by our store",
    maxLength: 2000,
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({ example: 500, description: "Weight in grams" })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  weight!: number;

  @ApiProperty({ example: 5, description: "Width in centimetres" })
  @IsInt()
  @Min(1)
  @Max(10_000)
  width!: number;

  @ApiProperty({ example: 5, description: "Length in centimetres" })
  @IsInt()
  @Min(1)
  @Max(10_000)
  length!: number;

  @ApiProperty({ example: 5, description: "Height in centimetres" })
  @IsInt()
  @Min(1)
  @Max(10_000)
  height!: number;

  @ApiPropertyOptional({
    example: "https://example.com/image.jpg",
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiProperty({ example: 30000, description: "Price in Rupiah (integer)" })
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price!: number;

  @ApiPropertyOptional({ example: 120, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
