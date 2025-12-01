import { ApiProperty } from '@nestjs/swagger';

export class TikTokBusinessVideoMetricPercentageDto {
  @ApiProperty({ description: 'Percentage value for the metric' })
  percentage: number;

  @ApiProperty({ description: 'Time in seconds for the metric' })
  second: string;
}

export class TikTokBusinessPostImpressionSourceDto {
  @ApiProperty({ description: 'Percentage of impressions from this source' })
  percentage: number;

  @ApiProperty({ description: 'Name of the impression source' })
  impression_source: string;
}

export class TikTokBusinessPostAudienceTypeDto {
  @ApiProperty({ description: 'Percentage of audience of this type' })
  percentage: number;

  @ApiProperty({ description: 'Type of audience' })
  type: string;
}

export class TikTokBusinessPostAudienceCountryDto {
  @ApiProperty({ description: 'Percentage of audience from this country' })
  percentage: number;

  @ApiProperty({ description: 'Country name' })
  country: string;
}

export class TikTokBusinessPostAudienceCityDto {
  @ApiProperty({ description: 'Percentage of audience from this city' })
  percentage: number;

  @ApiProperty({ description: 'City name' })
  city_name: string;
}

export class TikTokBusinessPostAudienceGenderDto {
  @ApiProperty({ description: 'Percentage of audience of this gender' })
  percentage: number;

  @ApiProperty({ description: 'Gender category' })
  gender: string;
}

export class TikTokBusinessMetricsDto {
  @ApiProperty({ description: 'Number of likes on the post' })
  likes: number;

  @ApiProperty({ description: 'Number of comments on the post' })
  comments: number;

  @ApiProperty({ description: 'Number of shares on the post' })
  shares: number;

  @ApiProperty({ description: 'Number of favorites on the post' })
  favorites: number;

  @ApiProperty({ description: 'Total reach of the post' })
  reach: number;

  @ApiProperty({ description: 'Total number of video views' })
  video_views: number;

  @ApiProperty({ description: 'Total time watched in seconds' })
  total_time_watched: number;

  @ApiProperty({ description: 'Average time watched in seconds' })
  average_time_watched: number;

  @ApiProperty({ description: 'Rate of full video watches as a percentage' })
  full_video_watched_rate: number;

  @ApiProperty({ description: 'Number of new followers gained from the post' })
  new_followers: number;

  @ApiProperty({ description: 'Number of profile views generated' })
  profile_views: number;

  @ApiProperty({ description: 'Number of website clicks' })
  website_clicks: number;

  @ApiProperty({ description: 'Number of phone number clicks' })
  phone_number_clicks: number;

  @ApiProperty({ description: 'Number of lead submissions' })
  lead_submissions: number;

  @ApiProperty({ description: 'Number of app download clicks' })
  app_download_clicks: number;

  @ApiProperty({ description: 'Number of email clicks' })
  email_clicks: number;

  @ApiProperty({ description: 'Number of address clicks' })
  address_clicks: number;

  @ApiProperty({
    description: 'Video view retention data by percentage and time',
    type: TikTokBusinessVideoMetricPercentageDto,
    isArray: true,
  })
  video_view_retention: TikTokBusinessVideoMetricPercentageDto[];

  @ApiProperty({
    description: 'Impression sources breakdown',
    type: TikTokBusinessPostImpressionSourceDto,
    isArray: true,
  })
  impression_sources: TikTokBusinessPostImpressionSourceDto[];

  @ApiProperty({
    description: 'Audience types breakdown',
    type: TikTokBusinessPostAudienceTypeDto,
    isArray: true,
  })
  audience_types: TikTokBusinessPostAudienceTypeDto[];

  @ApiProperty({
    description: 'Audience genders breakdown',
    type: TikTokBusinessPostAudienceGenderDto,
    isArray: true,
  })
  audience_genders: TikTokBusinessPostAudienceGenderDto[];

  @ApiProperty({
    description: 'Audience countries breakdown',
    type: TikTokBusinessPostAudienceCountryDto,
    isArray: true,
  })
  audience_countries: TikTokBusinessPostAudienceCountryDto[];

  @ApiProperty({
    description: 'Audience cities breakdown',
    type: TikTokBusinessPostAudienceCityDto,
    isArray: true,
  })
  audience_cities: TikTokBusinessPostAudienceCityDto[];

  @ApiProperty({
    description: 'Engagement likes data by percentage and time',
    type: TikTokBusinessVideoMetricPercentageDto,
    isArray: true,
  })
  engagement_likes: TikTokBusinessVideoMetricPercentageDto[];
}
