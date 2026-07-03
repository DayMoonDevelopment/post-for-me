import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type {
  InstagramAudioAsset,
  InstagramAudioSearchResponse,
  Paging,
  PagingCursors,
} from '../instagram.types';

export class InstagramAudioQueryDto {
  @ApiProperty({
    description: 'The type of audio to search for',
    enum: ['music', 'original_sound'],
    required: true,
  })
  @IsIn(['music', 'original_sound'])
  audio_type: 'music' | 'original_sound';

  @ApiProperty({
    description:
      'Search string to filter results by keyword. If omitted, trending audio is returned.',
    required: false,
  })
  @IsString()
  @IsOptional()
  search_query?: string;
}

export class InstagramAudioAssetDto implements InstagramAudioAsset {
  @ApiProperty({
    description:
      'Unique identifier of the audio asset. Use as `audio_configuration.audio_id` when creating an Instagram reel post.',
  })
  audio_id: string;

  @ApiProperty({
    description: 'Title of the audio asset',
    nullable: true,
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Display name of the artist. Returned for music only.',
    nullable: true,
    required: false,
  })
  display_artist?: string;

  @ApiProperty({
    description: 'Duration of the audio asset in milliseconds',
    nullable: true,
    required: false,
  })
  duration_in_ms?: number;

  @ApiProperty({
    description: 'Type of the audio asset',
    enum: ['music', 'original_sound'],
    nullable: true,
    required: false,
  })
  audio_type?: string;

  @ApiProperty({
    description:
      'Temporary URL to preview the audio file. Expires after approximately 1.5 days. May be null.',
    nullable: true,
    required: false,
  })
  download_url?: string | null;

  @ApiProperty({
    description:
      'URL of the cover artwork thumbnail. Returned for music only. May be null.',
    nullable: true,
    required: false,
  })
  cover_artwork_thumbnail_uri?: string | null;

  @ApiProperty({
    description:
      'Instagram username of the creator. Returned for original sounds only.',
    nullable: true,
    required: false,
  })
  ig_username?: string;

  @ApiProperty({
    description:
      "URL of the creator's profile picture. Returned for original sounds only.",
    nullable: true,
    required: false,
  })
  profile_picture_url?: string;

  @ApiProperty({
    description: 'Whether the audio asset can be used in ads',
    nullable: true,
    required: false,
  })
  is_ads_eligible?: boolean | null;

  @ApiProperty({
    description: 'URL to preview the audio on Instagram. May be null.',
    nullable: true,
    required: false,
  })
  on_platform_audio_preview_link?: string | null;
}

export class InstagramAudioPagingCursorsDto implements PagingCursors {
  @ApiProperty({
    description: 'Cursor for the previous page of results',
    nullable: true,
    required: false,
  })
  before?: string;

  @ApiProperty({
    description: 'Cursor for the next page of results',
    nullable: true,
    required: false,
  })
  after?: string;
}

export class InstagramAudioPagingDto implements Paging {
  @ApiProperty({
    description: 'Paging cursors',
    type: InstagramAudioPagingCursorsDto,
    nullable: true,
    required: false,
  })
  cursors?: InstagramAudioPagingCursorsDto;

  @ApiProperty({
    description: 'URL of the next page of results',
    nullable: true,
    required: false,
  })
  next?: string;

  @ApiProperty({
    description: 'URL of the previous page of results',
    nullable: true,
    required: false,
  })
  previous?: string;
}

export class InstagramAudioResponseDto implements InstagramAudioSearchResponse {
  @ApiProperty({
    description: 'List of audio assets',
    type: InstagramAudioAssetDto,
    isArray: true,
  })
  audio: InstagramAudioAssetDto[];

  @ApiProperty({
    description: 'Paging information for fetching further results',
    type: InstagramAudioPagingDto,
    nullable: true,
    required: false,
  })
  paging?: InstagramAudioPagingDto;
}
