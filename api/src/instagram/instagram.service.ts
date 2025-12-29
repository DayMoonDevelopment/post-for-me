import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios, { AxiosError } from 'axios';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  InstagramMediaItem,
  InstagramMediaListResponse,
  InstagramRefreshTokenResponse,
  FacebookRefreshTokenResponse,
  InstagramAccountMetadata,
  InstagramInsightsResponse,
  InstagramInsight,
} from './instagram.types';

@Injectable({ scope: Scope.REQUEST })
export class InstagramService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  getApiBaseUrl(account: SocialAccount) {
    // Use graph.instagram.com for direct IG tokens, graph.facebook.com otherwise

    const accountMetaData =
      account.social_provider_metadata as InstagramAccountMetadata;
    if (
      accountMetaData?.connection_type === 'instagram' ||
      (account.access_token && account.access_token.startsWith('IG'))
    ) {
      return 'https://graph.instagram.com/v23.0';
    }
    return 'https://graph.facebook.com/v23.0';
  }

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'instagram')
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

  async initFacebookService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'instagram_w_facebook')
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
    try {
      const accountMetaData =
        account.social_provider_metadata as InstagramAccountMetadata;

      if (accountMetaData?.connection_type === 'instagram') {
        const response = await axios.get<InstagramRefreshTokenResponse>(
          'https://graph.instagram.com/refresh_access_token',
          {
            params: {
              grant_type: 'ig_refresh_token',
              access_token: account.access_token,
            },
          },
        );

        const data = response.data;
        if (data?.access_token) {
          const newAccessToken = data.access_token;
          const expiresIn = data.expires_in;

          account.access_token = newAccessToken;
          account.access_token_expires_at = new Date(
            Date.now() + expiresIn * 1000,
          );
        }
      } else {
        const response = await axios.get<FacebookRefreshTokenResponse>(
          'https://graph.facebook.com/v20.0/oauth/access_token',
          {
            params: {
              grant_type: 'fb_exchange_token',
              client_id: this.appCredentials.appId,
              client_secret: this.appCredentials.appSecret,
              set_token_expires_in_60_days: true,
              fb_exchange_token: account.access_token,
            },
          },
        );

        const data = response.data;

        if (data && data.access_token) {
          const newAccessToken = data.access_token;
          const expiresIn = data.expires_in || 5184000;

          account.access_token = newAccessToken;
          account.access_token_expires_at = new Date(
            Date.now() + expiresIn * 1000,
          );
        }
      }

      return account;
    } catch (error) {
      console.error('Error refreshing Instagram token:', error);
      throw error;
    }
  }

  /**
   * Extracts insight values from Instagram insights response
   */
  private extractInsightsFromResponse(
    insights?: InstagramInsightsResponse,
  ): Partial<InstagramMediaItem> {
    if (!insights || !insights.data) {
      return {};
    }

    const insightValues: Partial<InstagramMediaItem> = {};

    insights.data.forEach((insight: InstagramInsight) => {
      const value = insight.values?.[0]?.value;
      if (value !== undefined) {
        switch (insight.name) {
          case 'comments':
            insightValues.comments = value;
            break;
          case 'follows':
            insightValues.follows = value;
            break;
          case 'ig_reels_avg_watch_time':
            insightValues.ig_reels_avg_watch_time = value;
            break;
          case 'ig_reels_video_view_total_time':
            insightValues.ig_reels_video_view_total_time = value;
            break;
          case 'likes':
            insightValues.likes = value;
            break;
          case 'navigation':
            insightValues.navigation = value;
            break;
          case 'profile_activity':
            insightValues.profile_activity = value;
            break;
          case 'profile_visits':
            insightValues.profile_visits = value;
            break;
          case 'reach':
            insightValues.reach = value;
            break;
          case 'replies':
            insightValues.replies = value;
            break;
          case 'saved':
            insightValues.saved = value;
            break;
          case 'shares':
            insightValues.shares = value;
            break;
          case 'total_interactions':
            insightValues.total_interactions = value;
            break;
          case 'views':
            insightValues.views = value;
            break;
        }
      }
    });

    return insightValues;
  }

  /**
   * Converts an Instagram media item to a platform post
   */
  private mapMediaItemToPlatformPost(
    item: InstagramMediaItem,
    accountId: string,
    includeMetrics: boolean = false,
  ): PlatformPost {
    const insights = this.extractInsightsFromResponse(item.insights);

    const post: PlatformPost = {
      provider: 'instagram',
      id: item.id,
      account_id: accountId,
      caption: item.caption || '',
      url: item.permalink || '',
      posted_at: item.timestamp,
      media: [
        {
          url: item.media_url || '',
          thumbnail_url: item.thumbnail_url || item.media_url || '',
        },
      ],
      metrics: includeMetrics
        ? {
            likes: insights.likes,
            comments: insights.comments,
            views: insights.views,
            reach: insights.reach,
            saved: insights.saved,
            shares: insights.shares,
            replies: insights.replies,
            follows: insights.follows,
            ig_reels_avg_watch_time: insights.ig_reels_avg_watch_time,
            ig_reels_video_view_total_time:
              insights.ig_reels_video_view_total_time,
            navigation: insights.navigation,
            profile_activity: insights.profile_activity,
            profile_visits: insights.profile_visits,
            total_interactions: insights.total_interactions,
          }
        : undefined,
    } as PlatformPost;

    return post;
  }

  /**
   * Fetches insights for a specific media item
   */
  private async fetchMediaInsights(
    mediaId: string,
    mediaType: 'FEED' | 'STORY' | 'REELS' | undefined,
    baseUrl: string,
    accessToken: string,
  ): Promise<InstagramInsightsResponse | undefined> {
    try {
      // Different metrics are available for different media types
      const metrics: string[] = [];

      switch (mediaType) {
        case 'REELS':
          metrics.push(
            ...[
              `comments`,
              `ig_reels_avg_watch_time`,
              `ig_reels_video_view_total_time`,
              `likes`,
              `reach`,
              `saved`,
              `shares`,
              `total_interactions`,
              `views`,
            ],
          );
          break;
        case 'STORY':
          metrics.push(
            ...[
              `follows`,
              `navigation`,
              `profile_activity`,
              `profile_visits`,
              `reach`,
              `replies`,
              `shares`,
              `total_interactions`,
              `views`,
            ],
          );
          break;
        default:
          metrics.push(
            ...[
              'comments',
              'follows',
              'likes',
              'profile_activity',
              'profile_visits',
              'reach',
              'saved',
              'shares',
              'total_interactions',
              'views',
            ],
          );

          break;
      }

      const insightsUrl = `${baseUrl}/${mediaId}/insights`;
      const response = await axios.get<InstagramInsightsResponse>(insightsUrl, {
        params: {
          metric: metrics.join(','),
          period: 'lifetime',
          access_token: accessToken,
        },
      });

      return response.data;
    } catch (error: unknown) {
      // Insights may not be available for all media (e.g., old posts, stories)
      // Log but don't throw - we'll return the post without insights
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.debug(
        `Could not fetch insights for media ${mediaId}:`,
        errorMessage,
      );

      if (error instanceof AxiosError) {
        console.error(error.response?.data);
      }

      return undefined;
    }
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
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    try {
      const safeLimit = Math.min(limit, 25);
      const baseUrl = this.getApiBaseUrl(account);

      const mediaUrl = `${baseUrl}/${account.social_provider_user_id}/media`;
      const baseFields =
        'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp';

      if (platformIds && platformIds.length > 0) {
        // Fetch specific media by IDs with insights
        const mediaPromises = platformIds.map(async (id) => {
          const mediaResponse = await axios.get<InstagramMediaItem>(
            `${baseUrl}/${id}`,
            {
              params: {
                fields: baseFields,
                access_token: account.access_token,
              },
            },
          );

          const mediaItem = mediaResponse.data;

          // Fetch insights for this media only if metrics are requested
          const insights = includeMetrics
            ? await this.fetchMediaInsights(
                id,
                mediaItem.media_product_type,
                baseUrl,
                account.access_token,
              )
            : undefined;

          return {
            ...mediaItem,
            insights,
          };
        });

        const mediaItems = await Promise.all(mediaPromises);

        const posts: PlatformPost[] = mediaItems.map(
          (item: InstagramMediaItem) =>
            this.mapMediaItemToPlatformPost(
              item,
              account.social_provider_user_id,
              includeMetrics,
            ),
        );

        return {
          posts,
          count: posts.length,
          has_more: false,
        };
      }

      // Fetch media list
      const response = await axios.get<InstagramMediaListResponse>(mediaUrl, {
        params: {
          fields: baseFields,
          access_token: account.access_token,
          limit: safeLimit,
          after: cursor,
        },
      });

      // Fetch insights for each media item only if metrics are requested
      const mediaWithInsights = includeMetrics
        ? await Promise.all(
            (response.data.data || []).map(async (item) => {
              const insights = await this.fetchMediaInsights(
                item.id,
                item.media_product_type,
                baseUrl,
                account.access_token,
              );

              return {
                ...item,
                insights,
              };
            }),
          )
        : response.data.data.map((item) => ({ ...item, insights: undefined }));

      const posts: PlatformPost[] = mediaWithInsights.map((item) =>
        this.mapMediaItemToPlatformPost(
          item,
          account.social_provider_user_id,
          includeMetrics,
        ),
      );

      return {
        posts,
        count: posts.length,
        has_more: !!response.data.paging?.next,
        cursor: response.data.paging?.cursors?.after,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(error.response?.data);
      } else {
        console.error('unkown error', error);
      }

      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
