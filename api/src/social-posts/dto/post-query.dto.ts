import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { BasePaginatedQueryDto } from '../../pagination/base-paginated-query.dto';
import { PostStatus } from './post.dto';

export enum Platform {
  BLUESKY = 'bluesky',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  PINTEREST = 'pinterest',
  THREADS = 'threads',
  TIKTOK = 'tiktok',
  X = 'x',
  YOUTUBE = 'youtube',
}

export class SocialPostQueryDto extends BasePaginatedQueryDto {
  @ApiProperty({
    description: 'Filter by platforms. Multiple values imply OR logic.',
    required: false,
    type: 'array',
    items: { type: 'string', enum: Object.values(Platform) },
  })
  @IsEnum(Platform, { each: true })
  @IsOptional()
  platform?: string[];

  @ApiProperty({
    description: 'Filter by post status. Multiple values imply OR logic.',
    required: false,
    type: 'array',
    items: { type: 'string', enum: Object.values(PostStatus) },
  })
  @IsEnum(PostStatus, { each: true })
  @IsOptional()
  status?: PostStatus[];

  @ApiProperty({
    description: 'Filter by external ID. Multiple values imply OR logic.',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  external_id?: string[];

  @ApiProperty({
    description: 'Filter by social account ID. Multiple values imply OR logic.',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  social_account_id?: string[];
}
