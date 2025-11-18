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
      await this.supabaseService.supabaseServiceRole
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
    const refreshRequestBody = {
      client_id: this.appCredentials.appId,
      client_secret: this.appCredentials.appSecret,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    };

    const refreshResponse = await axios.post(
      this.tokenUrl,
      refreshRequestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const refreshData = refreshResponse.data as {
      code: number;
      message: string;
      data: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    };

    if (refreshData.code !== 0) {
      throw new Error(`TikTok API error: ${refreshData.message}`);
    }

    const { access_token, refresh_token, expires_in } = refreshData.data;

    const newExpirationDate = new Date(Date.now() + expires_in * 1000);

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
    let getVideosUrl = `${this.apiUrl}business/video/list/?business_id=${account.social_provider_user_id}&fields=["item_id","create_time","thumbnail_url","share_url","embed_url","caption","video_views","likes","comments","shares","reach","video_duration","full_video_watched_rate","total_time_watched","average_time_watched","impression_sources","audience_countries"]`;

    if (platformIds) {
      getVideosUrl += `&filters["video_ids"]=[${platformIds.join(',').toString()}]`;
    }

    const safeLimit = Math.min(limit, 20);

    getVideosUrl += `&max_count=${safeLimit}`;

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
        videos: (TikTokBusinessMetricsDto & {
          item_id: string;
          share_url: string;
          caption: string;
          embed_url: string;
          thumbnail_url: string;
        })[];
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
          metrics: {
            likes: v.likes,
            comments: v.comments,
            shares: v.shares,
            favorites: v.favorites,
            reach: v.reach,
            video_views: v.video_views,
            total_time_watched: v.total_time_watched,
            average_time_watched: v.average_time_watched,
            full_video_watched_rate: v.full_video_watched_rate,
            new_followers: v.new_followers,
            profile_views: v.profile_views,
            website_clicks: v.website_clicks,
            phone_number_clicks: v.phone_number_clicks,
            lead_submissions: v.lead_submissions,
            app_download_clicks: v.app_download_clicks,
            email_clicks: v.email_clicks,
            address_clicks: v.address_clicks,
            video_view_retention: v.video_view_retention,
            impression_sources: v.impression_sources,
            audience_types: v.audience_types,
            audience_genders: v.audience_genders,
            audience_countries: v.audience_countries,
            audience_cities: v.audience_cities,
            engagement_likes: v.engagement_likes,
          },
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
