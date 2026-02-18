import { ApiProperty } from '@nestjs/swagger';

export class UserTagDto {
  @ApiProperty({
    description:
      'Facebook User ID, Instagram Username or Instagram product id to tag',
    required: true,
  })
  id: string;

  @ApiProperty({
    description:
      'The type of tag, user to tag accounts, product to tag products (only supported for instagram)',
    enum: ['user', 'product'],
    required: true,
  })
  type: string;

  @ApiProperty({
    description: 'The platform for the tags',
    required: true,
    enum: ['facebook', 'instagram'],
  })
  platform: string;

  @ApiProperty({
    description:
      'Percentage distance from left edge of the image, Not required for videos or stories',
    required: false,
  })
  x?: number;

  @ApiProperty({
    description:
      'Percentage distance from top edge of the image, Not required for videos or stories',
    required: false,
  })
  y?: number;
}

export class SocialPostMediaDto {
  @ApiProperty({ description: 'Public URL of the media' })
  url: string;

  @ApiProperty({
    description: 'Public URL of the thumbnail for the media',
    nullable: true,
    required: false,
  })
  thumbnail_url: string | null | undefined;

  @ApiProperty({
    description:
      'Timestamp in milliseconds of frame to use as thumbnail for the media',
    nullable: true,
    required: false,
  })
  thumbnail_timestamp_ms: number | null | undefined;

  @ApiProperty({
    description: 'List of tags to attach to the media',
    nullable: true,
    required: false,
    type: UserTagDto,
    isArray: true,
  })
  tags?: UserTagDto[] | null;

  @ApiProperty({
    description:
      "If true the media will not be processed at all and instead be posted as is, this may increase chance of post failure if media does not meet platform's requirements. Best used for larger files.",
    nullable: true,
    required: false,
    type: Boolean,
    default: false,
  })
  skip_processing?: boolean | null;
}
