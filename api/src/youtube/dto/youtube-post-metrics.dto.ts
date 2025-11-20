import { ApiProperty } from '@nestjs/swagger';

export class YouTubePostMetricsDto {
  @ApiProperty({ description: 'Number of views on the video' })
  views: number;

  @ApiProperty({ description: 'Number of likes on the video' })
  likes: number;

  @ApiProperty({ description: 'Number of comments on the video' })
  comments: number;

  @ApiProperty({ description: 'Number of dislikes on the video' })
  dislikes: number;

  @ApiProperty({
    description: 'Annotation click-through rate',
    required: false,
  })
  annotationClickThroughRate?: number;

  @ApiProperty({ description: 'Annotation close rate', required: false })
  annotationCloseRate?: number;

  @ApiProperty({
    description: 'Average view duration in seconds',
    required: false,
  })
  averageViewDuration?: number;

  @ApiProperty({ description: 'Number of engaged views', required: false })
  engagedViews?: number;

  @ApiProperty({
    description: 'Estimated minutes watched',
    required: false,
  })
  estimatedMinutesWatched?: number;

  @ApiProperty({ description: 'Number of shares', required: false })
  shares?: number;

  @ApiProperty({ description: 'Subscribers gained', required: false })
  subscribersGained?: number;

  @ApiProperty({ description: 'Subscribers lost', required: false })
  subscribersLost?: number;

  @ApiProperty({
    description: 'Viewer percentage (audience retention)',
    required: false,
  })
  viewerPercentage?: number;
}
