import { ApiProperty } from '@nestjs/swagger';

export class TikTokPostMetricsDto {
  @ApiProperty({ description: 'Number of likes on the video' })
  like_count: number;

  @ApiProperty({ description: 'Number of comments on the video' })
  comment_count: number;

  @ApiProperty({ description: 'Number of shares of the video' })
  share_count: number;

  @ApiProperty({ description: 'Number of views on the video' })
  view_count: number;
}
