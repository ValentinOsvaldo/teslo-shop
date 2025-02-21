import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Nike Air Max 90',
    description: 'The name of the product',
  })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({
    example: 119.99,
    description: 'The price of the product',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: 'The best shoes ever',
    description: 'The description of the product',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'nike-air-max-90',
    description: 'The slug of the product',
    uniqueItems: true,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    example: 10,
    description: 'The stock of the product',
  })
  @IsInt()
  @IsOptional()
  stock?: number;

  @ApiProperty({
    example: ['40', '41', '42', '43'],
    description: 'The sizes of the product',
  })
  @IsString({ each: true })
  @IsArray()
  sizes: string[];

  @ApiProperty({
    description: 'Gender of the product',
    enum: ['men', 'women', 'kid', 'unisex'],
  })
  @IsIn(['men', 'women', 'kid', 'unisex'])
  gender: string;

  @ApiProperty({
    example: ['running', 'sport', 'nike'],
    description: 'The tags of the product',
  })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: ['https://example.com/image'],
    description: 'The images of the product',
  })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  images?: string[];
}
