import { ApiProperty } from '@nestjs/swagger';

export class PinterestPostMetricsDto {
  @ApiProperty({
    description: 'Number of times the Pin was shown (impressions)',
    required: false,
  })
  IMPRESSION?: number;

  @ApiProperty({
    description:
      'Number of clicks from the Pin to an external destination (outbound clicks)',
    required: false,
  })
  OUTBOUND_CLICK?: number;

  @ApiProperty({
    description:
      'Number of clicks on the Pin to view it in closeup (Pin clicks)',
    required: false,
  })
  PIN_CLICK?: number;

  @ApiProperty({
    description: 'Number of saves of the Pin',
    required: false,
  })
  SAVE?: number;

  @ApiProperty({
    description: 'Save rate for the Pin (saves divided by impressions)',
    required: false,
  })
  SAVE_RATE?: number;

  @ApiProperty({
    description: 'Number of comments on the Pin',
    required: false,
  })
  TOTAL_COMMENTS?: number;

  @ApiProperty({
    description: 'Total number of reactions on the Pin',
    required: false,
  })
  TOTAL_REACTIONS?: number;

  @ApiProperty({
    description: 'Number of follows driven from the Pin',
    required: false,
  })
  USER_FOLLOW?: number;

  @ApiProperty({
    description: "Number of visits to the author's profile driven from the Pin",
    required: false,
  })
  PROFILE_VISIT?: number;

  @ApiProperty({
    description:
      'Number of video views that meet the MRC viewability standard (video MRC views)',
    required: false,
  })
  VIDEO_MRC_VIEW?: number;

  @ApiProperty({
    description: 'Number of video views of at least 10 seconds',
    required: false,
  })
  VIDEO_10S_VIEW?: number;

  @ApiProperty({
    description: 'Number of video views that reached 95% completion',
    required: false,
  })
  QUARTILE_95_PERCENT_VIEW?: number;

  @ApiProperty({
    description:
      'Total watch time where at least 50% of the video was in view (seconds)',
    required: false,
  })
  VIDEO_V50_WATCH_TIME?: number;

  @ApiProperty({
    description: 'Number of video starts for the Pin',
    required: false,
  })
  VIDEO_START?: number;

  @ApiProperty({
    description: 'Average video watch time for the Pin (seconds)',
    required: false,
  })
  VIDEO_AVG_WATCH_TIME?: number;
}
