import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { TikTokBusinessMetricsDto } from './platform-post-metrics.dto';
import { TikTokPostMetricsDto } from '../../tiktok/dto/tiktok-post-metrics.dto';
import { InstagramPostMetricsDto } from '../../instagram/dto/instagram-post-metrics.dto';
import { YouTubePostMetricsDto } from '../../youtube/dto/youtube-post-metrics.dto';
import { FacebookPostMetricsDto } from '../../facebook/dto/facebook-post-metrics.dto';

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
    ],
  })
  metrics?:
    | TikTokBusinessMetricsDto
    | TikTokPostMetricsDto
    | InstagramPostMetricsDto
    | YouTubePostMetricsDto
    | FacebookPostMetricsDto;
}
