import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
  PlatformPostMetadata,
} from '../lib/dto/global.dto';
import axios, { AxiosError } from 'axios';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  TikTokTokenResponse,
  TikTokVideoListResponse,
  TikTokVideo,
} from './tiktok.types';

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
    includeMetrics: boolean = false,
  ): PlatformPost {
    const post: PlatformPost = {
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
      metrics: includeMetrics
        ? {
            like_count: video.like_count || 0,
            comment_count: video.comment_count || 0,
            share_count: video.share_count || 0,
            view_count: video.view_count || 0,
          }
        : undefined,
    } as PlatformPost;

    return post;
  }

  async getAccountPosts({
    account,
    platformPostsMetadata,
    limit,
    cursor,
    includeMetrics = false,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    platformPostsMetadata?: PlatformPostMetadata[];
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    try {
      const safeLimit = Math.min(limit, 20);

      // If platformPostsMetadata is provided, use caption and date matching
      if (platformPostsMetadata && platformPostsMetadata.length > 0) {
        return await this.matchVideosByMetadata({
          metadata: platformPostsMetadata,
          account,
          includeMetrics,
        });
      }

      // Build fields list based on whether metrics are requested
      const baseFields =
        'id,create_time,cover_image_url,share_url,duration,title,embed_link';
      const metricsFields = 'like_count,comment_count,share_count,view_count';
      const fields = includeMetrics
        ? `${baseFields},${metricsFields}`
        : baseFields;

      // Otherwise, use the video list endpoint to get recent videos
      const response = await axios.post<TikTokVideoListResponse>(
        `${this.apiUrl}video/list/?fields=${fields}`,
        {
          max_count: safeLimit,
          cursor: cursor ? parseInt(cursor) : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      const data = response.data;
      const videos = data.data?.videos || [];
      const posts: PlatformPost[] = videos.map((video) =>
        this.mapVideoToPlatformPost(
          video,
          account.social_provider_user_id,
          includeMetrics,
        ),
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
   * Matches videos by caption and posted date metadata
   * Paginates through videos until all matches are found or we've gone past the date range
   * Matches are based on caption similarity and timestamp (within 1 hour)
   */
  private async matchVideosByMetadata({
    metadata,
    account,
    includeMetrics = false,
  }: {
    metadata: PlatformPostMetadata[];
    account: SocialAccount;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    // Find the date range from all posts
    const dates = metadata.map((m) => new Date(m.postedAt).getTime());

    if (dates.length === 0) {
      console.warn('No valid posted dates provided for video matching');
      return { posts: [], count: 0, has_more: false };
    }

    const minDate = Math.min(...dates);

    // Add buffer of 1 hour on each side
    const bufferMs = 60 * 60 * 1000; // 1 hour in milliseconds
    const minTimestamp = Math.floor((minDate - bufferMs) / 1000);

    // Build fields list based on whether metrics are requested
    const baseFields =
      'id,create_time,cover_image_url,share_url,duration,title,video_description,embed_link';
    const metricsFields = 'like_count,comment_count,share_count,view_count';
    const fields = includeMetrics
      ? `${baseFields},${metricsFields}`
      : baseFields;

    try {
      const matchedPosts: PlatformPost[] = [];
      let cursor: number | undefined = undefined;
      let hasMore = true;
      let shouldContinue = true;

      // Keep track of which metadata items we've matched
      const unmatchedMetadata = new Set(
        metadata
          .filter((m) => m.caption && m.postedAt)
          .map((m) => m.platformId),
      );

      // Paginate through videos until we find all matches or reach videos outside our date range
      while (hasMore && shouldContinue && unmatchedMetadata.size > 0) {
        const response = await axios.post<TikTokVideoListResponse>(
          `${this.apiUrl}video/list/?fields=${fields}`,
          {
            max_count: 20,
            cursor: cursor,
          },
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
          },
        );

        const data: TikTokVideoListResponse = response.data;

        const videos: TikTokVideo[] = data.data?.videos || [];
        hasMore = data.data?.has_more || false;
        cursor = data.data?.cursor;

        // Check if any videos in this batch are older than our minimum date
        // If so, we can stop paginating as videos are returned in reverse chronological order
        const hasVideoOutsideRange = videos.some((video: TikTokVideo) => {
          if (!video.create_time) return false;
          return video.create_time < minTimestamp;
        });

        // Try to match videos in this batch
        for (const meta of metadata) {
          // Skip if we've already matched this metadata
          if (!unmatchedMetadata.has(meta.platformId)) continue;

          const targetTime = new Date(meta.postedAt).getTime();
          const normalizedCaption = this.normalizeCaption(meta.caption);

          // Find matching video in this batch
          const matchedVideo = videos.find((video: TikTokVideo) => {
            if (!video.create_time) return false;

            const videoTime = video.create_time * 1000; // Convert to milliseconds
            const timeDiff = Math.abs(videoTime - targetTime);

            // Check if within 1 hour
            if (timeDiff > bufferMs) return false;

            // Check if caption matches
            const videoCaption = this.normalizeCaption(
              video.title || video.video_description || '',
            );

            return this.captionsMatch(normalizedCaption, videoCaption);
          });

          if (matchedVideo) {
            matchedPosts.push(
              this.mapVideoToPlatformPost(
                matchedVideo,
                account.social_provider_user_id,
                includeMetrics,
              ),
            );
            unmatchedMetadata.delete(meta.platformId);
          }
        }

        // Stop if we've found a video outside our date range
        shouldContinue = !hasVideoOutsideRange;
      }

      return {
        posts: matchedPosts,
        count: matchedPosts.length,
        has_more: false,
      };
    } catch (error) {
      console.error('Error matching TikTok videos by metadata');
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
   * Normalizes a caption for comparison by trimming and converting to lowercase
   */
  private normalizeCaption(caption: string): string {
    return caption.trim().toLowerCase();
  }

  /**
   * Checks if two captions match (exact match after normalization)
   */
  private captionsMatch(caption1: string, caption2: string): boolean {
    return caption1 === caption2;
  }
}
