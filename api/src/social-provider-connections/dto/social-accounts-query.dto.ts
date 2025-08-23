import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BasePaginatedQueryDto } from '../../pagination/base-paginated-query.dto';

export class SocialAccountQueryDto extends BasePaginatedQueryDto {
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
      'Filter by username(s). Multiple values imply OR logic (e.g., ?username=test&username=test2).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  username?: string[];

  @ApiProperty({
    description:
      'Filter by externalId(s). Multiple values imply OR logic (e.g., ?externalId=test&externalId=test2).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  external_id?: string[];

  @ApiProperty({
    description:
      'Filter by id(s). Multiple values imply OR logic (e.g., ?id=spc_xxxxxx&id=spc_yyyyyy).',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsString({ each: true })
  @IsOptional()
  id?: string[];
}
