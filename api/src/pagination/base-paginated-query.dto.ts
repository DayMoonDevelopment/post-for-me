import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class BasePaginatedQueryDto {
  @ApiProperty({
    description:
      'Cursor for keyset pagination. Preferred over offset. If cursor is provided, offset is ignored.',
    required: false,
    example:
      'eyJjcmVhdGVkX2F0IjoiMjAyNi0wNC0xN1QxMDowMDowMC4wMDBaIiwiaWQiOiJzcF8xMjMifQ',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiProperty({
    description:
      'Number of items to skip when offset pagination is used. Ignored when cursor is provided.',
    default: DEFAULT_OFFSET,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset: number = DEFAULT_OFFSET;

  @ApiProperty({
    description:
      'Number of items to return for either cursor or offset pagination.',
    default: DEFAULT_LIMIT,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @IsOptional()
  @Type(() => Number)
  limit: number = DEFAULT_LIMIT;
}
