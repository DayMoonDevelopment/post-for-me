import { ApiProperty } from '@nestjs/swagger';

export class YouTubePostMetricsDto {
  @ApiProperty({ description: 'Number of views on the post' })
  viewCount: number;

  @ApiProperty({ description: 'Number of favorites on the post' })
  favoriteCount: number;

  @ApiProperty({ description: 'Number of likes on the post' })
  likeCount: number;

  @ApiProperty({ description: 'Number of commetns on the post' })
  commentCount: number;

  @ApiProperty({ description: 'Number of dislikes on the post' })
  dislikeCount: number;
}
