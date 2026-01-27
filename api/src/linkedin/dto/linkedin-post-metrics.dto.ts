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
      "VIDEO_VIEW: Video views with play-pause cycles for at least 3 seconds. Auto-looping videos are counted as one when loaded. Each subsequent auto-looped play doesn't increase this metric. Analytics data for this metric won't be available after six months",
    required: false,
  })
  videoView?: number;

  @ApiProperty({
    description:
      "VIEWER: Unique viewers who made engaged plays on the video. Auto-looping videos are counted as one when loaded. Each subsequent auto-looped play doesn't increase this metric. Analytics data for this metric won't be available after six months",
    required: false,
  })
  viewer?: number;

  @ApiProperty({
    description:
      'TIME_WATCHED: The time the video was watched in milliseconds. Video auto-looping will continue to increase this metric for each subsequent play',
    required: false,
  })
  timeWatched?: number;

  @ApiProperty({
    description:
      'TIME_WATCHED_FOR_VIDEO_VIEWS: The time watched in milliseconds for video play-pause cycles that are at least 3 seconds. Video auto-looping will continue to increase this metric for each subsequent play. Analytics data for this metric will be available for six months',
    required: false,
  })
  timeWatchedForVideoViews?: number;
}
