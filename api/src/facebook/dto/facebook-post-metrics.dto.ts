import { ApiProperty } from '@nestjs/swagger';

export class FacebookVideoRetentionGraphDto {
  @ApiProperty({ description: 'Time in seconds' })
  time: number;

  @ApiProperty({ description: 'Percentage of viewers at this time' })
  rate: number;
}

export class FacebookVideoViewTimeByDemographicDto {
  @ApiProperty({
    description: 'Demographic key (e.g., age_gender, region, country)',
  })
  key: string;

  @ApiProperty({ description: 'Total view time in milliseconds' })
  value: number;
}

export class FacebookActivityByActionTypeDto {
  @ApiProperty({ description: 'Action type (e.g., like, comment, share)' })
  action_type: string;

  @ApiProperty({ description: 'Number of actions' })
  value: number;
}

export class FacebookPostMetricsDto {
  // Reach and Impressions
  @ApiProperty({
    description: 'Total number of unique people who saw the post',
    required: false,
  })
  reach?: number;

  @ApiProperty({
    description:
      'Number of people who saw the post in News Feed via viral reach',
    required: false,
  })
  viral_reach?: number;

  @ApiProperty({
    description: 'Number of people who saw the post via paid distribution',
    required: false,
  })
  paid_reach?: number;

  @ApiProperty({
    description: 'Number of fans who saw the post',
    required: false,
  })
  fan_reach?: number;

  @ApiProperty({
    description: 'Number of people who saw the post via organic distribution',
    required: false,
  })
  organic_reach?: number;

  @ApiProperty({
    description: 'Number of people who saw the post via non-viral distribution',
    required: false,
  })
  nonviral_reach?: number;

  // Media Views
  @ApiProperty({
    description: 'Number of times the photo or video was viewed',
    required: false,
  })
  media_views?: number;

  // Reactions
  @ApiProperty({
    description: 'Total number of reactions (all types)',
    required: false,
  })
  reactions_total?: number;

  @ApiProperty({
    description: 'Number of like reactions',
    required: false,
  })
  reactions_like?: number;

  @ApiProperty({
    description: 'Number of love reactions',
    required: false,
  })
  reactions_love?: number;

  @ApiProperty({
    description: 'Number of wow reactions',
    required: false,
  })
  reactions_wow?: number;

  @ApiProperty({
    description: 'Number of haha reactions',
    required: false,
  })
  reactions_haha?: number;

  @ApiProperty({
    description: 'Number of sad reactions',
    required: false,
  })
  reactions_sorry?: number;

  @ApiProperty({
    description: 'Number of anger reactions',
    required: false,
  })
  reactions_anger?: number;

  @ApiProperty({
    description: 'Breakdown of all reaction types',
    required: false,
  })
  reactions_by_type?: Record<string, number>;

  // Video Metrics - Views
  @ApiProperty({
    description: 'Number of times video was viewed for 3+ seconds',
    required: false,
  })
  video_views?: number;

  @ApiProperty({
    description: 'Number of unique people who viewed the video for 3+ seconds',
    required: false,
  })
  video_views_unique?: number;

  @ApiProperty({
    description: 'Number of times video was viewed for 3+ seconds organically',
    required: false,
  })
  video_views_organic?: number;

  @ApiProperty({
    description:
      'Number of unique people who viewed the video for 3+ seconds organically',
    required: false,
  })
  video_views_organic_unique?: number;

  @ApiProperty({
    description:
      'Number of times video was viewed for 3+ seconds via paid distribution',
    required: false,
  })
  video_views_paid?: number;

  @ApiProperty({
    description:
      'Number of unique people who viewed the video for 3+ seconds via paid distribution',
    required: false,
  })
  video_views_paid_unique?: number;

  @ApiProperty({
    description: 'Number of times video was autoplayed for 3+ seconds',
    required: false,
  })
  video_views_autoplayed?: number;

  @ApiProperty({
    description: 'Number of times video was clicked to play for 3+ seconds',
    required: false,
  })
  video_views_clicked_to_play?: number;

  @ApiProperty({
    description: 'Number of times video was viewed for 15+ seconds',
    required: false,
  })
  video_views_15s?: number;

  @ApiProperty({
    description:
      'Number of times video was viewed for 60+ seconds (excludes videos shorter than 60s)',
    required: false,
  })
  video_views_60s?: number;

  @ApiProperty({
    description: 'Number of times video was viewed with sound on',
    required: false,
  })
  video_views_sound_on?: number;

  // Video Metrics - Complete Views
  @ApiProperty({
    description: 'Number of times video was viewed to 95% organically',
    required: false,
  })
  video_complete_views_organic?: number;

  @ApiProperty({
    description: 'Number of unique people who viewed video to 95% organically',
    required: false,
  })
  video_complete_views_organic_unique?: number;

  @ApiProperty({
    description:
      'Number of times video was viewed to 95% via paid distribution',
    required: false,
  })
  video_complete_views_paid?: number;

  @ApiProperty({
    description:
      'Number of unique people who viewed video to 95% via paid distribution',
    required: false,
  })
  video_complete_views_paid_unique?: number;

  // Video Metrics - Watch Time
  @ApiProperty({
    description: 'Total time video was viewed in milliseconds',
    required: false,
  })
  video_view_time?: number;

  @ApiProperty({
    description:
      'Total time video was viewed in milliseconds via organic distribution',
    required: false,
  })
  video_view_time_organic?: number;

  @ApiProperty({
    description: 'Average time video was viewed in milliseconds',
    required: false,
  })
  video_avg_time_watched?: number;

  @ApiProperty({
    description: 'Length of the video in milliseconds',
    required: false,
  })
  video_length?: number;

  // Video Metrics - Demographics
  @ApiProperty({
    description: 'Video view time breakdown by age and gender',
    required: false,
    type: [FacebookVideoViewTimeByDemographicDto],
  })
  video_view_time_by_age_gender?: FacebookVideoViewTimeByDemographicDto[];

  @ApiProperty({
    description: 'Video view time breakdown by region',
    required: false,
    type: [FacebookVideoViewTimeByDemographicDto],
  })
  video_view_time_by_region?: FacebookVideoViewTimeByDemographicDto[];

  @ApiProperty({
    description: 'Video view time breakdown by country',
    required: false,
    type: [FacebookVideoViewTimeByDemographicDto],
  })
  video_view_time_by_country?: FacebookVideoViewTimeByDemographicDto[];

  // Video Metrics - Distribution
  @ApiProperty({
    description: 'Video views breakdown by distribution type',
    required: false,
  })
  video_views_by_distribution_type?: Record<string, number>;

  @ApiProperty({
    description: 'Video view time breakdown by distribution type',
    required: false,
  })
  video_view_time_by_distribution_type?: Record<string, number>;

  // Video Retention
  @ApiProperty({
    description: 'Video retention graph for clicked-to-play views',
    required: false,
    type: [FacebookVideoRetentionGraphDto],
  })
  video_retention_graph_clicked_to_play?: FacebookVideoRetentionGraphDto[];

  @ApiProperty({
    description: 'Video retention graph for autoplayed views',
    required: false,
    type: [FacebookVideoRetentionGraphDto],
  })
  video_retention_graph_autoplayed?: FacebookVideoRetentionGraphDto[];

  // Social Actions
  @ApiProperty({
    description:
      'Number of unique people who performed social actions on the video',
    required: false,
  })
  video_social_actions_unique?: number;

  // Activity
  @ApiProperty({
    description: 'Total activity breakdown by action type',
    required: false,
    type: [FacebookActivityByActionTypeDto],
  })
  activity_by_action_type?: FacebookActivityByActionTypeDto[];

  @ApiProperty({
    description: 'Unique users activity breakdown by action type',
    required: false,
    type: [FacebookActivityByActionTypeDto],
  })
  activity_by_action_type_unique?: FacebookActivityByActionTypeDto[];

  // Legacy fields for backwards compatibility
  @ApiProperty({
    description: 'Number of comments (from post object)',
    required: false,
  })
  comments?: number;

  @ApiProperty({
    description: 'Number of shares (from post object)',
    required: false,
  })
  shares?: number;
}
