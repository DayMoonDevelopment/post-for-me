import { ApiProperty } from '@nestjs/swagger';

export class ThreadsPostMetricsDto {
  @ApiProperty({ description: 'Number of likes on the post' })
  likes: number;

  @ApiProperty({ description: 'Number of replies on the post' })
  replies: number;

  @ApiProperty({ description: 'Number of shares of the post' })
  shares: number;

  @ApiProperty({ description: 'Number of views on the post' })
  views: number;

  @ApiProperty({ description: 'Number of quotes of the post' })
  quotes: number;

  @ApiProperty({ description: 'Number of reposts of the post' })
  reposts: number;
}
