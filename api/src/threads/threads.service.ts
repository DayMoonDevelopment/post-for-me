import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios from 'axios';
import { SupabaseService } from '../supabase/supabase.service';

interface ThreadsPost {
  id: string;
  text?: string;
  permalink?: string;
  timestamp?: string;
  media_type?:
    | 'TEXT_POST'
    | 'IMAGE'
    | 'VIDEO'
    | 'CAROUSEL_ALBUM'
    | 'AUDIO'
    | 'REPOST_FACADE';
  media_url?: string;
  thumbnail?: string;
}

interface ThreadsPostsResponse {
  data: ThreadsPost[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

interface ThreadsRefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable({ scope: Scope.REQUEST })
export class ThreadsService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'threads')
        .single();

    if (!appCredentials || appCredentialsError) {
      console.error(appCredentialsError);
      throw new Error('No app credentials found for platform');
    }

    this.appCredentials = {
      appId: appCredentials.app_id || '',
      appSecret: appCredentials.app_secret || '',
      provider: appCredentials.provider,
      projectId: appCredentials.project_id,
    };
  }

  async refreshAccessToken(account: SocialAccount): Promise<SocialAccount> {
    const refreshResponse = await axios.get<ThreadsRefreshTokenResponse>(
      'https://graph.threads.net/refresh_access_token',
      {
        params: {
          grant_type: 'th_refresh_token',
          access_token: account.access_token,
        },
      },
    );

    const { access_token, expires_in } = refreshResponse.data;
    const newExpirationDate = new Date(Date.now() + expires_in * 1000);
    newExpirationDate.setSeconds(newExpirationDate.getSeconds() - 300);

    account.access_token = access_token;
    account.access_token_expires_at = newExpirationDate;

    return account;
  }

  async getAccountPosts({
    account,
    platformIds,
    limit,
    cursor,
    includeMetrics = false,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    platformPostsMetadata?: any;
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    try {
      const safeLimit = Math.min(limit, 25);

      // Fetch threads from user's profile
      const response = await axios.get<ThreadsPostsResponse>(
        `https://graph.threads.net/v1.0/${account.social_provider_user_id}/threads`,
        {
          params: {
            fields:
              'id,text,permalink,timestamp,media_type,media_url,thumbnail_url',
            access_token: account.access_token,
            limit: safeLimit,
            after: cursor,
          },
        },
      );

      const posts: PlatformPost[] = (response.data.data ?? []).map(
        (thread) => ({
          provider: 'threads',
          id: thread.id,
          account_id: account.social_provider_user_id,
          caption: thread.text ?? '',
          url: thread.permalink ?? '',
          media: thread.media_url
            ? [{ url: thread.media_url, thumbnail_url: thread.thumbnail_url }]
            : [],
          metrics: includeMetrics
            ? {
                likes: 0,
                comments: 0,
                shares: 0,
                favorites: 0,
                reach: 0,
                video_views: 0,
                total_time_watched: 0,
                average_time_watched: 0,
                full_video_watched_rate: 0,
                new_followers: 0,
                profile_views: 0,
                website_clicks: 0,
                phone_number_clicks: 0,
                lead_submissions: 0,
                app_download_clicks: 0,
                email_clicks: 0,
                address_clicks: 0,
                video_view_retention: [],
                impression_sources: [],
                audience_types: [],
                audience_genders: [],
                audience_countries: [],
                audience_cities: [],
                engagement_likes: [],
              }
            : undefined,
        }),
      );

      return {
        posts,
        count: posts.length,
        has_more: !!response.data.paging?.cursors?.after,
        cursor: response.data.paging?.cursors?.after,
      };
    } catch (error) {
      console.error('Error fetching Threads posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
