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

  @ApiProperty({ description: 'Number of engaged views', required: false })
  engagedViews?: number;

  @ApiProperty({
    description: 'Number of views from YouTube Premium (Red) members',
    required: false,
  })
  redViews?: number;

  @ApiProperty({
    description: 'Number of times the video was added to playlists',
    required: false,
  })
  videosAddedToPlaylists?: number;

  @ApiProperty({
    description: 'Number of times the video was removed from playlists',
    required: false,
  })
  videosRemovedFromPlaylists?: number;

  @ApiProperty({ description: 'Number of shares', required: false })
  shares?: number;

  @ApiProperty({
    description: 'Estimated minutes watched',
    required: false,
  })
  estimatedMinutesWatched?: number;

  @ApiProperty({
    description: 'Estimated minutes watched by YouTube Premium (Red) members',
    required: false,
  })
  estimatedRedMinutesWatched?: number;

  @ApiProperty({
    description: 'Average view duration in seconds',
    required: false,
  })
  averageViewDuration?: number;

  @ApiProperty({
    description: 'Average percentage of the video watched',
    required: false,
  })
  averageViewPercentage?: number;

  @ApiProperty({
    description: 'Annotation click-through rate',
    required: false,
  })
  annotationClickThroughRate?: number;

  @ApiProperty({ description: 'Annotation close rate', required: false })
  annotationCloseRate?: number;

  @ApiProperty({
    description: 'Number of annotation impressions',
    required: false,
  })
  annotationImpressions?: number;

  @ApiProperty({
    description: 'Number of clickable annotation impressions',
    required: false,
  })
  annotationClickableImpressions?: number;

  @ApiProperty({
    description: 'Number of closable annotation impressions',
    required: false,
  })
  annotationClosableImpressions?: number;

  @ApiProperty({ description: 'Number of annotation clicks', required: false })
  annotationClicks?: number;

  @ApiProperty({ description: 'Number of annotation closes', required: false })
  annotationCloses?: number;

  @ApiProperty({ description: 'Card click-through rate', required: false })
  cardClickRate?: number;

  @ApiProperty({
    description: 'Card teaser click-through rate',
    required: false,
  })
  cardTeaserClickRate?: number;

  @ApiProperty({ description: 'Number of card impressions', required: false })
  cardImpressions?: number;

  @ApiProperty({
    description: 'Number of card teaser impressions',
    required: false,
  })
  cardTeaserImpressions?: number;

  @ApiProperty({ description: 'Number of card clicks', required: false })
  cardClicks?: number;

  @ApiProperty({
    description: 'Number of card teaser clicks',
    required: false,
  })
  cardTeaserClicks?: number;

  @ApiProperty({ description: 'Subscribers gained', required: false })
  subscribersGained?: number;

  @ApiProperty({ description: 'Subscribers lost', required: false })
  subscribersLost?: number;
}
