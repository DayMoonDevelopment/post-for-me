import { ApiProperty } from '@nestjs/swagger';
import { FacebookPostMetricsDto } from 'src/facebook/dto/facebook-post-metrics.dto';
import { InstagramPostMetricsDto } from 'src/instagram/dto/instagram-post-metrics.dto';
import { LinkedInPostMetricsDto } from 'src/linkedin/dto/linkedin-post-metrics.dto';
import { ThreadsPostMetricsDto } from 'src/threads/dto/threads-post-metrics.dto';
import { TikTokBusinessMetricsDto } from 'src/tiktok-business/dto/tiktok-business-post-metrics.dto';
import { TikTokPostMetricsDto } from 'src/tiktok/dto/tiktok-post-metrics.dto';
import { TwitterPostMetricsDto } from 'src/twitter/dto/twitter-post-metrics.dto';
import { YouTubePostMetricsDto } from 'src/youtube/dto/youtube-post-metrics.dto';

export class DeleteEntityResponseDto {
  @ApiProperty({ description: 'Whether or not the entity was deleted' })
  success: boolean;
}

export type Provider =
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'linkedin'
  | 'bluesky'
  | 'threads'
  | 'tiktok_business'
  | 'instagram_w_facebook'
  | null
  | undefined;

export interface SocialProviderAppCredentials {
  provider: Provider;
  projectId: string;
  appId: string;
  appSecret: string;
}

export interface SocialAccount {
  provider: Provider;
  id: string;
  social_provider_user_name: string | null | undefined;
  access_token: string;
  refresh_token: string | null;
  access_token_expires_at: Date | null;
  refresh_token_expires_at: Date | null;
  social_provider_user_id: string;
  social_provider_metadata: any;
}

export interface PlatformPost {
  provider: Provider;
  id: string;
  account_id: string;
  caption: string;
  url: string;
  posted_at?: string;
  media: { url: string; thumbnail_url?: string }[];
  metrics?:
    | FacebookPostMetricsDto
    | TikTokBusinessMetricsDto
    | TikTokPostMetricsDto
    | InstagramPostMetricsDto
    | LinkedInPostMetricsDto
    | TwitterPostMetricsDto
    | YouTubePostMetricsDto
    | ThreadsPostMetricsDto;
}

export interface PlatformPostsResponse {
  posts: PlatformPost[];
  count: number;
  cursor?: string;
  has_more: boolean;
}

export interface PlatformPostMetadata {
  platformId: string;
  caption: string;
  postedAt: string;
}
