import { Injectable } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios from 'axios';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TikTokService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  tokenUrl: string;
  apiUrl: string;

  constructor(private readonly supabaseService: SupabaseService) {
    this.tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    this.apiUrl = 'https://open.tiktokapis.com/v2/';
  }

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'tiktok')
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
    const formData = new URLSearchParams();
    formData.append('client_key', this.appCredentials.appId);
    formData.append('client_secret', this.appCredentials.appSecret);
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', account.refresh_token || '');

    const refreshResponse = await axios.post(this.tokenUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
    });

    if (refreshResponse.data.error) {
      throw new Error(
        `TikTok API error: ${
          refreshResponse.data.error_description || refreshResponse.data.error
        }`,
      );
    }

    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    const newExpirationDate = new Date(Date.now() + expires_in * 1000);

    // Set expiration to refresh two days early
    newExpirationDate.setDate(newExpirationDate.getDate() - 2);

    account.access_token = access_token;
    account.refresh_token = refresh_token;
    account.access_token_expires_at = newExpirationDate;

    return account;
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
      const safeLimit = Math.min(limit, 20);

      // TikTok API doesn't have a direct "get my videos" endpoint in the standard API
      // This is a placeholder implementation - actual implementation would depend on
      // available TikTok API endpoints for the project
      const response = await axios.post(
        `${this.apiUrl}video/list/`,
        {
          max_count: safeLimit,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      const data = response.data as {
        data: {
          videos: any[];
          cursor: number;
          has_more: boolean;
        };
      };

      const posts: PlatformPost[] = (data.data.videos || []).map(
        (video: any) => ({
          provider: 'tiktok',
          id: video.id,
          account_id: account.social_provider_user_id,
          caption: video.title || '',
          url: video.share_url || '',
          media: [
            {
              url: video.embed_link || '',
              thumbnail_url: video.cover_image_url || '',
            },
          ],
          metrics: {
            likes: video.like_count || 0,
            comments: video.comment_count || 0,
            shares: video.share_count || 0,
            favorites: 0,
            reach: 0,
            video_views: video.view_count || 0,
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
        }),
      );

      return {
        posts,
        count: posts.length,
        has_more: data.data.has_more,
        cursor: data.data.cursor.toString(),
      };
    } catch (error) {
      console.error('Error fetching TikTok posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
