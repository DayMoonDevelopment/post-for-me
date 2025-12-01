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
  TikTokTokenResponse,
  TikTokVideoListResponse,
  TikTokVideo,
  TikTokPublishStatusResponse,
  TikTokVideoQueryResponse,
} from './tiktok.types';
import type { TikTokPostMetricsDto } from './dto/tiktok-post-metrics.dto';

@Injectable({ scope: Scope.REQUEST })
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

    const refreshResponse = await axios.post<TikTokTokenResponse>(
      this.tokenUrl,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
      },
    );

    const data = refreshResponse.data;

    if (data.error) {
      throw new Error(
        `TikTok API error: ${data.error_description || data.error}`,
      );
    }

    const newExpirationDate = new Date(Date.now() + data.expires_in * 1000);

    // Set expiration to refresh two days early
    newExpirationDate.setDate(newExpirationDate.getDate() - 2);

    account.access_token = data.access_token;
    account.refresh_token = data.refresh_token;
    account.access_token_expires_at = newExpirationDate;

    return account;
  }

  /**
   * Converts a TikTok video item to a platform post
   */
  private mapVideoToPlatformPost(
    video: TikTokVideo,
    accountId: string,
  ): PlatformPost {
    const metrics: TikTokPostMetricsDto = {
      like_count: video.like_count || 0,
      comment_count: video.comment_count || 0,
      share_count: video.share_count || 0,
      view_count: video.view_count || 0,
    };

    return {
      provider: 'tiktok',
      id: video.id,
      account_id: accountId,
      caption: video.title || video.video_description || '',
      url: video.share_url || '',
      posted_at: video.create_time
        ? new Date(video.create_time * 1000).toISOString()
        : undefined,
      media: [
        {
          url: video.embed_link || '',
          thumbnail_url: video.cover_image_url || '',
        },
      ],
      metrics,
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
      let videoIds: string[] | undefined;
      const safeLimit = Math.min(limit, 20);

      console.log(platformIds);
      // If platformIds are provided, fetch the video IDs from publish IDs
      if (platformIds && platformIds.length > 0) {
        videoIds = await this.getVideoIdsFromPublishIds({
          publishIds: platformIds,
          account,
        });
        // If we have specific video IDs, use the video query endpoint
        if (!videoIds || videoIds.length == 0) {
          return { posts: [], count: 0, has_more: false };
        }

        return await this.queryVideosByIds({
          videoIds,
          account,
        });
      }

      // Otherwise, use the video list endpoint to get recent videos
      const response = await axios.post<TikTokVideoListResponse>(
        `${this.apiUrl}video/list/?fields=id,create_time,cover_image_url,share_url,duration,title,embed_link,like_count,comment_count,share_count,view_count`,
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

      const data = response.data;
      console.log(data);

      const videos = data.data?.videos || [];
      const posts: PlatformPost[] = videos.map((video) =>
        this.mapVideoToPlatformPost(video, account.social_provider_user_id),
      );

      return {
        posts,
        count: posts.length,
        has_more: data.data?.has_more || false,
        cursor: data.data?.cursor?.toString(),
      };
    } catch (error) {
      console.error('Error getting TikTok posts');
      if (error instanceof AxiosError) {
        console.error(error.response?.data);
      } else {
        console.error(error);
      }

      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }

  /**
   * Gets video IDs from publish IDs using the publish status endpoint
   */
  private async getVideoIdsFromPublishIds({
    publishIds,
    account,
  }: {
    publishIds: string[];
    account: SocialAccount;
  }): Promise<string[]> {
    const statusUrl = `${this.apiUrl}post/publish/status/fetch/`;

    // Fetch all publish statuses in parallel
    const statusPromises = publishIds.map(async (publishId) => {
      try {
        const response = await axios.post<TikTokPublishStatusResponse>(
          statusUrl,
          {
            publish_id: publishId,
          },
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
          },
        );

        const statusData = response.data;

        console.log(response.data);
        if ((statusData.data.publicaly_available_post_id?.length || 0) > 0) {
          return statusData.data.publicaly_available_post_id[0].toString();
        }

        return null;
      } catch (error) {
        console.error(
          `Failed to fetch status for publish_id ${publishId}:`,
          error,
        );

        if (error instanceof AxiosError) {
          console.error(error.response?.data);
        }
        return null;
      }
    });

    const videoIds = await Promise.all(statusPromises);

    // Filter out null values and return only valid video IDs
    return videoIds.filter((id): id is string => id !== null);
  }

  /**
   * Queries specific videos by their IDs
   */
  private async queryVideosByIds({
    videoIds,
    account,
  }: {
    videoIds: string[];
    account: SocialAccount;
  }): Promise<PlatformPostsResponse> {
    const response = await axios.post<TikTokVideoQueryResponse>(
      `${this.apiUrl}video/query/?fields=id,create_time,cover_image_url,share_url,duration,title,embed_link,like_count,comment_count,share_count,view_count`,
      {
        filters: {
          video_ids: videoIds,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      },
    );

    const data = response.data;

    if (data.error) {
      throw new Error(
        `TikTok API error: ${data.error.message} (${data.error.code})`,
      );
    }

    const videos = data.data?.videos || [];
    const posts: PlatformPost[] = videos.map((video) =>
      this.mapVideoToPlatformPost(video, account.social_provider_user_id),
    );

    return {
      posts,
      count: posts.length,
      has_more: false,
    };
  }
}
