import { ApiProperty } from '@nestjs/swagger';

export class TwitterPublicMetricsDto {
  @ApiProperty({ description: 'Number of Retweets of this Tweet' })
  retweet_count: number;

  @ApiProperty({ description: 'Number of Replies of this Tweet' })
  reply_count: number;

  @ApiProperty({ description: 'Number of Likes of this Tweet' })
  like_count: number;

  @ApiProperty({ description: 'Number of Quotes of this Tweet' })
  quote_count: number;

  @ApiProperty({ description: 'Number of times this Tweet has been viewed' })
  impression_count: number;

  @ApiProperty({
    description: 'Number of times this Tweet has been bookmarked',
  })
  bookmark_count: number;
}

export class TwitterOrganicMetricsDto {
  @ApiProperty({
    description: 'Number of times this Tweet has been viewed organically',
  })
  impression_count: number;

  @ApiProperty({
    description: 'Number of Likes of this Tweet from organic distribution',
  })
  like_count: number;

  @ApiProperty({
    description: 'Number of Replies of this Tweet from organic distribution',
  })
  reply_count: number;

  @ApiProperty({
    description: 'Number of Retweets of this Tweet from organic distribution',
  })
  retweet_count: number;

  @ApiProperty({
    description:
      'Number of clicks on links in this Tweet from organic distribution',
  })
  url_link_clicks: number;

  @ApiProperty({
    description:
      "Number of clicks on the author's profile from organic distribution",
  })
  user_profile_clicks: number;
}

export class TwitterNonPublicMetricsDto {
  @ApiProperty({
    description:
      'Number of times this Tweet has been viewed via promoted distribution',
  })
  impression_count: number;

  @ApiProperty({
    description:
      'Number of clicks on links in this Tweet via promoted distribution',
  })
  url_link_clicks: number;

  @ApiProperty({
    description:
      "Number of clicks on the author's profile via promoted distribution",
  })
  user_profile_clicks: number;
}

export class TwitterPostMetricsDto {
  @ApiProperty({
    description: 'Publicly available metrics for the Tweet',
    required: false,
    type: TwitterPublicMetricsDto,
  })
  public_metrics?: TwitterPublicMetricsDto;

  @ApiProperty({
    description: 'Organic metrics for the Tweet (available to the Tweet owner)',
    required: false,
    type: TwitterOrganicMetricsDto,
  })
  organic_metrics?: TwitterOrganicMetricsDto;

  @ApiProperty({
    description:
      'Non-public metrics for the Tweet (available to the Tweet owner or advertisers)',
    required: false,
    type: TwitterNonPublicMetricsDto,
  })
  non_public_metrics?: TwitterNonPublicMetricsDto;
}
