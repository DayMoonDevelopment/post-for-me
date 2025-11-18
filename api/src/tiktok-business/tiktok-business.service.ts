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
import { TikTokBusinessMetricsDto } from '../social-account-feeds/dto/platform-post-metrics.dto';

@Injectable()
export class TikTokBusinessService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  tokenUrl: string;
  apiUrl: string;

  constructor(private readonly supabaseService: SupabaseService) {
    this.tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/';
  }

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseClient
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'tiktok_business')
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
    formData.append('refresh_token', account.refresh_token!);

    const refreshResponse = await axios.post(this.tokenUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
    });

    const error = refreshResponse?.data as {
      error?: string;
      error_description?: string;
    };
    if (error) {
      throw new Error(
        `TikTok API error: ${error.error_description || error.error}`,
      );
    }

    const now = new Date();
    const { access_token, refresh_token, expires_in } =
      refreshResponse.data as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    const newExpirationDate = new Date(now.getTime() + expires_in * 1000);

    //Set expiration so it refreshes two days early
    newExpirationDate.setDate(newExpirationDate.getDate() - 2);

    account.access_token = access_token;
    account.refresh_token = refresh_token;
    account.access_token_expires_at = newExpirationDate;
    return account;
  }

  async getAccountPosts({
    account,
    platformIds,
  }: {
    account: SocialAccount;
    platformIds?: string[];
  }): Promise<PlatformPostsResponse> {
    let getVideosUrl = `${this.apiUrl}business/video/list/?business_id=${account.social_provider_user_id}&fields=["item_id","create_time","thumbnail_url","share_url","embed_url","caption","video_views","likes","comments","shares","reach","video_duration","full_video_watched_rate","total_time_watched","average_time_watched","impression_sources","audience_countries"]`;

    if (platformIds) {
      getVideosUrl += `&filters["video_ids"]=[${platformIds.join(',').toString()}]`;
    }

    const videoResponse = await axios.get(getVideosUrl, {
      headers: {
        'Access-Token': account.access_token,
      },
    });

    const data = videoResponse.data as {
      code: number;
      message: string;
      data: {
        cursor: number;
        has_more: boolean;
        videos: TikTokBusinessMetricsDto &
          {
            item_id: string;
            share_url: string;
            caption: string;
            embed_url: string;
            thumbnail_url: string;
          }[];
      };
    };

    if (data.code != 0 && data.code != 20001) {
      throw new Error(`Unable to get posts, message: ${data.message}`);
    }

    const response: PlatformPostsResponse = {
      has_more: data.data.has_more,
      posts: data.data.videos.map(
        (v): PlatformPost => ({
          provider: 'tiktok_business',
          id: v.item_id,
          url: v.share_url,
          account_id: account.social_provider_user_id,
          caption: v.caption,
          metrics: {},
          media: [
            {
              url: v.embed_url,
              thumbnail_url: v.thumbnail_url,
            },
          ],
        }),
      ),
      cursor: data.data.cursor.toString(),
      count: data.data.videos.length,
    };

    return response;
  }
}
