import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { TikTokBusinessMetricsDto } from 'src/tiktok-business/dto/tiktok-business-post-metrics.dto';
import { TikTokPostMetricsDto } from 'src/tiktok/dto/tiktok-post-metrics.dto';
import { InstagramPostMetricsDto } from 'src/instagram/dto/instagram-post-metrics.dto';
import { YouTubePostMetricsDto } from 'src/youtube/dto/youtube-post-metrics.dto';
import { FacebookPostMetricsDto } from 'src/facebook/dto/facebook-post-metrics.dto';
import { TwitterPostMetricsDto } from 'src/twitter/dto/twitter-post-metrics.dto';
import { ThreadsPostMetricsDto } from 'src/threads/dto/threads-post-metrics.dto';
import { LinkedInPostMetricsDto } from 'src/linkedin/dto/linkedin-post-metrics.dto';
import { BlueskyPostMetricsDto } from 'src/bluesky/dto/bluesky-post-metrics.dto';

export class PlatformPostDto {
  @ApiProperty({ description: 'Social media platform name' })
  platform: string;

  @ApiProperty({
    description: 'ID of the social post result',
    required: false,
    nullable: true,
  })
  social_post_result_id?: string;

  @ApiProperty({
    description: 'Date the post was published',
    required: false,
    type: Date,
  })
  posted_at?: string;

  @ApiProperty({
    description: 'ID of the social post',
    required: false,
    nullable: true,
  })
  social_post_id?: string;

  @ApiProperty({
    description: 'External post ID from the platform',
    required: false,
    nullable: true,
  })
  external_post_id?: string;

  @ApiProperty({ description: 'Platform-specific post ID' })
  platform_post_id: string;

  @ApiProperty({
    description: 'ID of the social account',
  })
  social_account_id: string;

  @ApiProperty({
    description: 'External account ID from the platform',
    required: false,
    nullable: true,
  })
  external_account_id?: string;

  @ApiProperty({ description: 'Platform-specific account ID' })
  platform_account_id: string;

  @ApiProperty({ description: 'URL to the post on the platform' })
  platform_url: string;

  @ApiProperty({ description: 'Caption or text content of the post' })
  caption: string;

  @ApiProperty({
    description: 'Array of media items attached to the post',
    isArray: true,
  })
  media: any[];

  @ApiProperty({
    description: 'Post metrics and analytics data',
    required: false,
    oneOf: [
      { $ref: getSchemaPath(TikTokBusinessMetricsDto) },
      { $ref: getSchemaPath(TikTokPostMetricsDto) },
      { $ref: getSchemaPath(InstagramPostMetricsDto) },
      { $ref: getSchemaPath(YouTubePostMetricsDto) },
      { $ref: getSchemaPath(FacebookPostMetricsDto) },
      { $ref: getSchemaPath(TwitterPostMetricsDto) },
      { $ref: getSchemaPath(ThreadsPostMetricsDto) },
      { $ref: getSchemaPath(LinkedInPostMetricsDto) },
      { $ref: getSchemaPath(BlueskyPostMetricsDto) },
    ],
  })
  metrics?:
    | TikTokBusinessMetricsDto
    | TikTokPostMetricsDto
    | InstagramPostMetricsDto
    | YouTubePostMetricsDto
    | FacebookPostMetricsDto
    | TwitterPostMetricsDto
    | ThreadsPostMetricsDto;
}
