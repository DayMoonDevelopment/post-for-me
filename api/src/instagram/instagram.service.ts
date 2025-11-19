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
          case 'impressions':
            insightValues.impressions = value;
            break;
          case 'reach':
            insightValues.reach = value;
            break;
          case 'saved':
            insightValues.saved = value;
            break;
          case 'shares':
            insightValues.shares = value;
            break;
          case 'video_views':
            insightValues.video_views = value;
            break;
          case 'exits':
            insightValues.exits = value;
            break;
          case 'replies':
            insightValues.replies = value;
            break;
          case 'taps_forward':
            insightValues.taps_forward = value;
            break;
          case 'taps_back':
            insightValues.taps_back = value;
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
  ): PlatformPost {
    const insights = this.extractInsightsFromResponse(item.insights);

    return {
      provider: 'instagram',
      id: item.id,
      account_id: accountId,
      caption: item.caption || '',
      url: item.permalink || '',
      media: [
        {
          url: item.media_url || '',
          thumbnail_url: item.thumbnail_url || item.media_url || '',
        },
      ],
      metrics: {
        like_count: item.like_count || 0,
        comments_count: item.comments_count || 0,
        view_count: item.view_count || 0,
        impressions: insights.impressions || item.impressions,
        reach: insights.reach || item.reach,
        saved: insights.saved || item.saved,
        shares: insights.shares || item.shares,
        video_views: insights.video_views || item.video_views,
        exits: insights.exits || item.exits,
        replies: insights.replies || item.replies,
        taps_forward: insights.taps_forward || item.taps_forward,
        taps_back: insights.taps_back || item.taps_back,
      },
    };
  }

  /**
   * Fetches insights for a specific media item
   */
  private async fetchMediaInsights(
    mediaId: string,
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM',
    baseUrl: string,
    accessToken: string,
  ): Promise<InstagramInsightsResponse | undefined> {
    try {
      // Different metrics are available for different media types
      let metrics: string[];

      if (mediaType === 'VIDEO') {
        metrics = ['reach', 'saved', 'video_views', 'shares'];
      } else {
        // IMAGE or CAROUSEL_ALBUM
        metrics = ['reach', 'saved', 'shares'];
      }

      const insightsUrl = `${baseUrl}/${mediaId}/insights`;
      const response = await axios.get<InstagramInsightsResponse>(insightsUrl, {
        params: {
          metric: metrics.join(','),
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
  }: {
    account: SocialAccount;
    platformIds?: string[];
    limit: number;
  }): Promise<PlatformPostsResponse> {
    try {
      const safeLimit = Math.min(limit, 25);
      const baseUrl = this.getApiBaseUrl(account);

      const mediaUrl = `${baseUrl}/${account.social_provider_user_id}/media`;
      const baseFields =
        'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,view_count';

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

          // Fetch insights for this media
          const insights = await this.fetchMediaInsights(
            id,
            mediaItem.media_type,
            baseUrl,
            account.access_token,
          );

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
        },
      });

      // Fetch insights for each media item
      const mediaWithInsights = await Promise.all(
        (response.data.data || []).map(async (item) => {
          const insights = await this.fetchMediaInsights(
            item.id,
            item.media_type,
            baseUrl,
            account.access_token,
          );

          return {
            ...item,
            insights,
          };
        }),
      );

      const posts: PlatformPost[] = mediaWithInsights.map((item) =>
        this.mapMediaItemToPlatformPost(item, account.social_provider_user_id),
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
