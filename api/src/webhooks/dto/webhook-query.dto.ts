import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BasePaginatedQueryDto } from '../../pagination/base-paginated-query.dto';

export class WebhookQueryDto extends BasePaginatedQueryDto {
  @ApiProperty({
    description:
      'Filter by url(s). Multiple values imply OR logic (e.g., ?url=https://example.com&url=https://postforme.dev).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  url?: string[];

  @ApiProperty({
    description:
      'Filter by event type(s). Multiple values imply OR logic (e.g., ?event_type=social.post.created&event_type=social.post.updated).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  event_type?: string[];

  @ApiProperty({
    description:
      'Filter by id(s). Multiple values imply OR logic (e.g., ?id=wbh_xxxxxx&id=wbh_yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  id?: string;
}
