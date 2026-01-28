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
  thumbnail_url?: string;
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

interface ThreadsInsightsResponse {
  data: {
    name: string;
    values: { value: number }[];
  }[];
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

  private async addMetricsToPost(
    post: PlatformPost,
    threadId: string,
    accessToken: string,
  ): Promise<void> {
    try {
      const insightsRes = await axios.get<ThreadsInsightsResponse>(
        `https://graph.threads.net/v1.0/${threadId}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: 'likes,replies,reposts,quotes,shares,views',
          },
        },
      );

      if (insightsRes.data.data) {
        const metrics: { [key: string]: number } = {};
        insightsRes.data.data.forEach((metric) => {
          if (metric.values.length > 0) {
            metrics[metric.name] = metric.values[0].value;
          }
        });
        post.metrics = {
          likes: metrics.likes || 0,
          replies: metrics.replies || 0,
          reposts: metrics.reposts || 0,
          quotes: metrics.quotes || 0,
          shares: metrics.shares || 0,
          views: metrics.views || 0,
        };
      }
    } catch (error) {
      console.error(`Error fetching insights for post ${threadId}:`, error);
    }
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
    limit,
    cursor,
    platformIds,
    includeMetrics = false,
  }: {
    account: SocialAccount;
    limit: number;
    cursor?: string;
    platformIds?: string[];
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    try {
      let postsPromises: Promise<PlatformPost>[];
      let responseData: ThreadsPostsResponse | undefined;

      if (platformIds && platformIds.length > 0) {
        // Fetch specific threads by IDs
        postsPromises = platformIds.map(async (platformId) => {
          const threadResponse = await axios.get<ThreadsPost>(
            `https://graph.threads.net/v1.0/${platformId}`,
            {
              params: {
                fields:
                  'id,text,permalink,timestamp,media_type,media_url,thumbnail_url',
                access_token: account.access_token,
              },
            },
          );

          const thread = threadResponse.data;
          const post: PlatformPost = {
            provider: 'threads',
            id: thread.id,
            account_id: account.social_provider_user_id,
            caption: thread.text ?? '',
            url: thread.permalink ?? '',
            posted_at: thread.timestamp,
            media: thread.media_url
              ? [{ url: thread.media_url, thumbnail_url: thread.thumbnail_url }]
              : [],
          };

          if (includeMetrics) {
            await this.addMetricsToPost(post, thread.id, account.access_token);
          }

          return post;
        });
      } else {
        const safeLimit = Math.min(limit, 25);

        // Fetch threads from user's profile
        const response = await axios.get<ThreadsPostsResponse>(
          `https://graph.threads.net/v1.0/me/threads`,
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

        responseData = response.data;

        postsPromises = (responseData.data ?? []).map(async (thread) => {
          const post: PlatformPost = {
            provider: 'threads',
            id: thread.id,
            account_id: account.social_provider_user_id,
            caption: thread.text ?? '',
            url: thread.permalink ?? '',
            posted_at: thread.timestamp,
            media: thread.media_url
              ? [{ url: thread.media_url, thumbnail_url: thread.thumbnail_url }]
              : [],
          };

          if (includeMetrics) {
            await this.addMetricsToPost(post, thread.id, account.access_token);
          }

          return post;
        });
      }

      const posts = await Promise.all(postsPromises);

      return {
        posts,
        count: posts.length,
        has_more: responseData ? !!responseData.paging?.cursors?.after : false,
        cursor: responseData?.paging?.cursors?.after,
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
