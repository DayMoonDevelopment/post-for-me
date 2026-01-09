import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BasePaginatedQueryDto } from '../../pagination/base-paginated-query.dto';

export class SocialPostResultQueryDto extends BasePaginatedQueryDto {
  @ApiProperty({
    description:
      'Filter by post IDs. Multiple values imply OR logic (e.g., ?post_id=123&post_id=456).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  post_id?: string[];

  @ApiProperty({
    description:
      'Filter by platform(s). Multiple values imply OR logic (e.g., ?platform=x&platform=facebook).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  platform?: string[];

  @ApiProperty({
    description:
      'Filter by social account ID(s). Multiple values imply OR logic (e.g., ?social_account_id=123&social_account_id=456).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  social_account_id?: string[];
}
