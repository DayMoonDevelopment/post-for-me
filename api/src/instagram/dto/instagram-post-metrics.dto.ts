import { ApiProperty } from '@nestjs/swagger';

export class InstagramPostMetricsDto {
  @ApiProperty({ description: 'Number of likes on the post' })
  like_count: number;

  @ApiProperty({ description: 'Number of comments on the post' })
  comments_count: number;

  @ApiProperty({ description: 'Number of views on the post' })
  view_count: number;
}
