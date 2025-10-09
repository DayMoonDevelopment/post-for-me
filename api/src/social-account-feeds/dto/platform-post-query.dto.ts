import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BasePaginatedQueryDto } from '../../pagination/base-paginated-query.dto';

export class PlatformPostQueryDto extends BasePaginatedQueryDto {
  @ApiProperty({
    description:
      'Filter by Post for Me Social Postexternal ID. Multiple values imply OR logic (e.g., ?external_post_id=xxxxxx&external_post_id=yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  external_post_id?: string[];

  @ApiProperty({
    description:
      'Filter by Post for Me Social Post id(s). Multiple values imply OR logic (e.g., ?social_post_id=sp_xxxxxx&social_post_id=sp_yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  social_post_id?: string[];

  @ApiProperty({
    description:
      'Filter by Post for Me Social Post Result id(s). Multiple values imply OR logic (e.g., ?social_post_id=spr_xxxxxx&social_post_id=spr_yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  social_post_result_id?: string[];

  @ApiProperty({
    description:
      'Filter by Post for Me Social Post Account id(s). Multiple values imply OR logic (e.g., ?social_post_id=spc_xxxxxx&social_post_id=spc_yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  social_account_id?: string[];

  @ApiProperty({
    description:
      'Filter by Post for Me Social Postexternal ID. Multiple values imply OR logic (e.g., ?external_account_id=xxxxxx&external_account_id=yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  external_account_id?: string[];
}
