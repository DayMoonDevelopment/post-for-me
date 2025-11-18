import { ApiProperty } from '@nestjs/swagger';

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
  media: { url: string; thumbnail_url: string }[];
  metrics: any;
}

export interface PlatformPostsResponse {
  posts: PlatformPost[];
  count: number;
  total_count?: number;
  cursor?: string;
  has_more: boolean;
}
