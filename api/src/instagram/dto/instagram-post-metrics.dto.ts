import { ApiProperty } from '@nestjs/swagger';

export class InstagramPostMetricsDto {
  @ApiProperty({ description: 'Number of likes on the post' })
  like_count: number;

  @ApiProperty({ description: 'Number of comments on the post' })
  comments_count: number;

  @ApiProperty({ description: 'Number of views on the post' })
  view_count: number;

  @ApiProperty({
    description: 'Total number of times the media has been seen',
    required: false,
  })
  impressions?: number;

  @ApiProperty({
    description: 'Total number of unique accounts that have seen the media',
    required: false,
  })
  reach?: number;

  @ApiProperty({
    description: 'Total number of unique accounts that have saved the media',
    required: false,
  })
  saved?: number;

  @ApiProperty({
    description: 'Total number of shares of the media',
    required: false,
  })
  shares?: number;

  @ApiProperty({
    description: 'Number of video views (for video media)',
    required: false,
  })
  video_views?: number;

  @ApiProperty({
    description: 'Number of times someone exited the story (story media only)',
    required: false,
  })
  exits?: number;

  @ApiProperty({
    description: 'Number of replies to the story (story media only)',
    required: false,
  })
  replies?: number;

  @ApiProperty({
    description: 'Number of taps to see next story (story media only)',
    required: false,
  })
  taps_forward?: number;

  @ApiProperty({
    description: 'Number of taps to see previous story (story media only)',
    required: false,
  })
  taps_back?: number;
}
