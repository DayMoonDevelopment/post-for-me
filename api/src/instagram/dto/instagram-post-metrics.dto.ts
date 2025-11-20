import { ApiProperty } from '@nestjs/swagger';

export class InstagramPostMetricsDto {
  @ApiProperty({
    description: 'Number of likes on the post',
    required: false,
  })
  likes?: number;

  @ApiProperty({
    description: 'Number of comments on the post',
    required: false,
  })
  comments?: number;

  @ApiProperty({
    description: 'Number of views on the post',
    required: false,
  })
  views?: number;

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
    description: 'Number of replies to the story (story media only)',
    required: false,
  })
  replies?: number;

  @ApiProperty({
    description: 'Number of new follows from this post',
    required: false,
  })
  follows?: number;

  @ApiProperty({
    description: 'Average watch time for Reels (in milliseconds)',
    required: false,
  })
  ig_reels_avg_watch_time?: number;

  @ApiProperty({
    description: 'Total watch time for Reels (in milliseconds)',
    required: false,
  })
  ig_reels_video_view_total_time?: number;

  @ApiProperty({
    description: 'Navigation actions taken on the media',
    required: false,
  })
  navigation?: number;

  @ApiProperty({
    description: 'Profile activity generated from this post',
    required: false,
  })
  profile_activity?: number;

  @ApiProperty({
    description: 'Number of profile visits from this post',
    required: false,
  })
  profile_visits?: number;

  @ApiProperty({
    description: 'Total interactions on the post',
    required: false,
  })
  total_interactions?: number;
}
