import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class PlatformPostQueryDto {
  @ApiProperty({
    description:
      "Number of items to return; Note: some platforms will have different max limits, in the case the provided limit is over the platform's limit we will return the max allowed by the platform.",
    default: DEFAULT_LIMIT,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @IsOptional()
  @Type(() => Number)
  limit: number = DEFAULT_LIMIT;

  @ApiProperty({
    description: 'Cursor identifying next page of results',
    required: false,
  })
  @IsString()
  @IsOptional()
  cursor?: string;

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
      "Filter by the platform's id(s). Multiple values imply OR logic (e.g., ?social_post_id=spr_xxxxxx&social_post_id=spr_yyyyyy).",
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  platform_post_id?: string[];

  @ApiProperty({
    description:
      'Expand additional data in the response. Currently supports: "metrics" to include post analytics data.',
    required: false,
    type: 'array',
    items: { type: 'string', enum: ['metrics'] },
    example: ['metrics'],
  })
  @IsIn(['metrics'], { each: true })
  @IsOptional()
  expand?: string[];
}
