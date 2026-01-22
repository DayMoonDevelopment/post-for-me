import { ApiProperty } from '@nestjs/swagger';

export class BlueskyPostMetricsDto {
  @ApiProperty({ description: 'Number of replies on the post' })
  replyCount: number;

  @ApiProperty({ description: 'Number of likes on the post' })
  likeCount: number;

  @ApiProperty({ description: 'Number of reposts of the post' })
  repostCount: number;

  @ApiProperty({ description: 'Number of quotes of the post' })
  quoteCount: number;
}
