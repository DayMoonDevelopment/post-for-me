import { ApiProperty } from '@nestjs/swagger';

export class PinterestMetricsWindowDto {
  @ApiProperty({
    description: 'Number of times the Pin was shown (impressions)',
    required: false,
  })
  impression?: number;

  @ApiProperty({
    description:
      'Number of clicks from the Pin to an external destination (outbound clicks)',
    required: false,
  })
  outbound_click?: number;

  @ApiProperty({
    description:
      'Number of clicks on the Pin to view it in closeup (Pin clicks)',
    required: false,
  })
  pin_click?: number;

  @ApiProperty({
    description: 'Number of saves of the Pin',
    required: false,
  })
  save?: number;

  @ApiProperty({
    description: 'Number of comments on the Pin',
    required: false,
  })
  comment?: number;

  @ApiProperty({
    description: 'Total number of reactions on the Pin',
    required: false,
  })
  reaction?: number;

  @ApiProperty({
    description: 'Number of follows driven from the Pin',
    required: false,
    nullable: true,
  })
  user_follow?: number | null;

  @ApiProperty({
    description: "Number of visits to the author's profile driven from the Pin",
    required: false,
    nullable: true,
  })
  profile_visit?: number | null;

  @ApiProperty({
    description: 'Number of video views',
    required: false,
  })
  video_views?: number;

  @ApiProperty({
    description: 'Number of video views of at least 10 seconds',
    required: false,
  })
  video_10s_views?: number;

  @ApiProperty({
    description: 'Number of video views that reached 95% completion',
    required: false,
  })
  video_p95_views?: number;

  @ApiProperty({
    description: 'Total watch time for the video',
    required: false,
  })
  video_total_time?: number;

  @ApiProperty({
    description: 'Average watch time for the video',
    required: false,
  })
  video_average_time?: number;

  @ApiProperty({
    description: 'The last time Pinterest updated these metrics',
    required: false,
  })
  last_updated?: string;
}

export class PinterestPostMetricsDto {
  @ApiProperty({
    description: 'Last 90 days of Pin metrics',
    required: false,
    type: PinterestMetricsWindowDto,
  })
  '90d'?: PinterestMetricsWindowDto;

  @ApiProperty({
    description: 'Lifetime Pin metrics',
    required: false,
    type: PinterestMetricsWindowDto,
  })
  lifetime_metrics?: PinterestMetricsWindowDto;
}
