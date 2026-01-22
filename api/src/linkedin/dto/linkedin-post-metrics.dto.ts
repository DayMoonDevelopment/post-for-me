import { ApiProperty } from '@nestjs/swagger';

export class LinkedInPostMetrics {
  @ApiProperty({
    description: 'Number of impressions of the requested entity',
    required: false,
  })
  impression?: number;

  @ApiProperty({
    description:
      'Number of members reached, post viewers or unique impressions count metric',
    required: false,
  })
  membersReached?: number;

  @ApiProperty({
    description: 'Number of reshares/reposts of the requested entity',
    required: false,
  })
  reshare?: number;

  @ApiProperty({
    description: 'Number of reactions of the requested entity',
    required: false,
  })
  reaction?: number;

  @ApiProperty({
    description: 'Number of comments of the requested entity',
    required: false,
  })
  comment?: number;

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
