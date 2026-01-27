import { ApiProperty } from '@nestjs/swagger';

export class LinkedInPostMetricsDto {
  @ApiProperty({
    description: 'Number of clicks',
    required: false,
  })
  clickCount?: number;

  @ApiProperty({
    description: 'Number of comments',
    required: false,
  })
  commentCount?: number;

  @ApiProperty({
    description: 'Engagement rate',
    required: false,
  })
  engagement?: number;

  @ApiProperty({
    description: 'Number of impressions',
    required: false,
  })
  impressionCount?: number;

  @ApiProperty({
    description: 'Number of likes',
    required: false,
  })
  likeCount?: number;

  @ApiProperty({
    description: 'Number of shares',
    required: false,
  })
  shareCount?: number;

  @ApiProperty({
    description:
      "Video plays count with play-pause cycles for at least 2 seconds. Auto-looping videos are counted as one when loaded. Each subsequent auto-looped play doesn't increase this metric. Analytics data for this metric won't be available after one year of post creation",
    required: false,
  })
  videoPlay?: number;

  @ApiProperty({
    description:
      "Unique viewers who made engaged plays on the video. Auto-looping videos are counted as one when loaded. Each subsequent auto-looped play doesn't increase this metric. Analytics data for this metric won't be available after one year of post creation",
    required: false,
  })
  videoViewer?: number;

  @ApiProperty({
    description:
      'The total time the video was watched, in milliseconds. Video auto-looping will continue to increase this metric for each subsequent play',
    required: false,
  })
  videoWatchTime?: number;
}
