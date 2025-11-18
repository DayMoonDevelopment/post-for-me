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
import type {
  InstagramMediaItem,
  InstagramMediaListResponse,
  InstagramRefreshTokenResponse,
  FacebookRefreshTokenResponse,
  InstagramAccountMetadata,
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
   * Converts an Instagram media item to a platform post
   */
  private mapMediaItemToPlatformPost(
    item: InstagramMediaItem,
    accountId: string,
  ): PlatformPost {
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
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
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
      },
    };
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
      const params = {
        fields:
          'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        access_token: account.access_token,
        limit: safeLimit,
      };

      if (platformIds && platformIds.length > 0) {
        // Fetch specific media by IDs
        const mediaPromises = platformIds.map((id) =>
          axios.get<InstagramMediaItem>(`${baseUrl}/${id}`, {
            params: {
              fields:
                'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
              access_token: account.access_token,
            },
          }),
        );

        const responses = await Promise.all(mediaPromises);
        const mediaItems = responses.map((r) => r.data);

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

      const response = await axios.get<InstagramMediaListResponse>(mediaUrl, {
        params,
      });

      const posts: PlatformPost[] = (response.data.data || []).map((item) =>
        this.mapMediaItemToPlatformPost(item, account.social_provider_user_id),
      );

      return {
        posts,
        count: posts.length,
        has_more: !!response.data.paging?.next,
        cursor: response.data.paging?.cursors?.after,
      };
    } catch (error) {
      console.error('Error fetching Instagram posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
