import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    default: 1,
    description: 'Current page number',
  })
  @IsOptional()
  @IsPositive()
  // Transform
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    default: 10,
    description: 'The number of items to return',
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  per_page?: number;
}
