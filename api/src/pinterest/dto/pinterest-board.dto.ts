import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PinterestBoardOwnerDto {
  @ApiPropertyOptional({ type: String, readOnly: true })
  username?: string;
}

export class PinterestBoardMediaDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  image_cover_url?: string | null;

  @ApiPropertyOptional({ type: [String] })
  pin_thumbnail_urls?: string[];
}

// Documentation only: never instantiate/transform these DTOs for upstream data.
// Schema source: pinterest/api-description v5 Board, BoardBase, BoardMedia, BoardOwner.
export class PinterestBoardDto {
  [key: string]: unknown;

  @ApiProperty({ type: String, example: '549755885175', readOnly: true })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'PROTECTED', 'SECRET'] })
  privacy?: string;

  @ApiPropertyOptional({ type: Boolean })
  is_ads_only?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', readOnly: true })
  created_at?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', readOnly: true })
  board_pins_modified_at?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, readOnly: true })
  collaborator_count?: number;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, readOnly: true })
  follower_count?: number;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, readOnly: true })
  pin_count?: number;

  @ApiPropertyOptional({ type: PinterestBoardOwnerDto, readOnly: true })
  owner?: PinterestBoardOwnerDto;

  @ApiPropertyOptional({ type: PinterestBoardMediaDto, readOnly: true })
  media?: PinterestBoardMediaDto;
}

export class PinterestBoardsMetaDto {
  @ApiProperty({
    description: 'Pinterest bookmark for the next page, or an empty string.',
  })
  cursor: string;

  @ApiProperty({ type: Number })
  limit: number;

  @ApiProperty({ type: String, nullable: true })
  next: string | null;

  @ApiProperty({ type: Boolean })
  has_more: boolean;
}

export class PinterestBoardsResponseDto {
  @ApiProperty({ type: [PinterestBoardDto] })
  data: PinterestBoardDto[];

  @ApiProperty({ type: PinterestBoardsMetaDto })
  meta: PinterestBoardsMetaDto;
}
