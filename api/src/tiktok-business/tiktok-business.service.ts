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
import { TikTokBusinessMetricsDto } from './dto/tiktok-business-post-metrics.dto';

@Injectable({ scope: Scope.REQUEST })
export class TikTokBusinessService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  tokenUrl: string;
  apiUrl: string;

  constructor(private readonly supabaseService: SupabaseService) {
    this.tokenUrl =
      'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/';
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
    // If platformPostsMetadata is provided, use caption and date matching
    if (platformPostsMetadata && platformPostsMetadata.length > 0) {
      return await this.matchVideosByMetadata({
        metadata: platformPostsMetadata,
        account,
        includeMetrics,
      });
    }

    // Build fields list based on whether metrics are requested
    const fields = this.buildFieldsList(includeMetrics);
    const safeLimit = Math.min(limit, 20);

    // If platformIds are provided, query for specific videos using filters
    if (platformIds && platformIds.length > 0) {
      const getVideosUrl = `${this.apiUrl}business/video/list/?business_id=${account.social_provider_user_id}&fields=${fields}&filters={"video_ids":${JSON.stringify(platformIds)}}`;

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
            create_time?: number;
          })[];
        };
      };

      if (data.code != 0 && data.code != 20001) {
        throw new Error(`Unable to get posts, message: ${data.message}`);
      }

      const response: PlatformPostsResponse = {
        has_more: false,
        posts: data.data.videos.map(
          (v): PlatformPost => ({
            provider: 'tiktok_business',
            id: v.item_id,
            url: v.share_url,
            account_id: account.social_provider_user_id,
            caption: v.caption,
            posted_at: v.create_time
              ? new Date(v.create_time * 1000).toISOString()
              : undefined,
            metrics: includeMetrics
              ? {
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
                }
              : undefined,
            media: [
              {
                url: v.embed_url,
                thumbnail_url: v.thumbnail_url,
              },
            ],
          }),
        ),
        count: data.data.videos.length,
      };

      return response;
    }

    let getVideosUrl = `${this.apiUrl}business/video/list/?business_id=${account.social_provider_user_id}&fields=${fields}&max_count=${safeLimit}`;

    if (cursor) {
      getVideosUrl += `&cursor=${cursor}`;
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
        videos: (TikTokBusinessMetricsDto & {
          item_id: string;
          share_url: string;
          caption: string;
          embed_url: string;
          thumbnail_url: string;
          create_time?: number;
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
          posted_at: v.create_time
            ? new Date(v.create_time * 1000).toISOString()
            : undefined,
          metrics: includeMetrics
            ? {
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
              }
            : undefined,
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

    // Build fields list
    const fields = this.buildFieldsList(includeMetrics);

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
        let getVideosUrl = `${this.apiUrl}business/video/list/?business_id=${account.social_provider_user_id}&fields=${fields}&max_count=20`;

        if (cursor) {
          getVideosUrl += `&cursor=${cursor}`;
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
            videos: (TikTokBusinessMetricsDto & {
              item_id: string;
              share_url: string;
              caption: string;
              embed_url: string;
              thumbnail_url: string;
              create_time?: number;
            })[];
          };
        };

        if (data.code != 0 && data.code != 20001) {
          throw new Error(`Unable to get posts, message: ${data.message}`);
        }

        const videos = data.data?.videos || [];
        hasMore = data.data?.has_more || false;
        cursor = data.data?.cursor;

        // Check if any videos in this batch are older than our minimum date
        // If so, we can stop paginating as videos are returned in reverse chronological order
        const hasVideoOutsideRange = videos.some((video) => {
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
          const matchedVideo = videos.find((video) => {
            if (!video.create_time) return false;

            const videoTime = video.create_time * 1000; // Convert to milliseconds
            const timeDiff = Math.abs(videoTime - targetTime);

            // Check if within 1 hour
            if (timeDiff > bufferMs) return false;

            // Check if caption matches
            const videoCaption = this.normalizeCaption(video.caption || '');

            return this.captionsMatch(normalizedCaption, videoCaption);
          });

          if (matchedVideo) {
            matchedPosts.push({
              provider: 'tiktok_business',
              id: matchedVideo.item_id,
              url: matchedVideo.share_url,
              account_id: account.social_provider_user_id,
              caption: matchedVideo.caption,
              posted_at: matchedVideo.create_time
                ? new Date(matchedVideo.create_time * 1000).toISOString()
                : undefined,
              metrics: includeMetrics
                ? {
                    likes: matchedVideo.likes,
                    comments: matchedVideo.comments,
                    shares: matchedVideo.shares,
                    favorites: matchedVideo.favorites,
                    reach: matchedVideo.reach,
                    video_views: matchedVideo.video_views,
                    total_time_watched: matchedVideo.total_time_watched,
                    average_time_watched: matchedVideo.average_time_watched,
                    full_video_watched_rate:
                      matchedVideo.full_video_watched_rate,
                    new_followers: matchedVideo.new_followers,
                    profile_views: matchedVideo.profile_views,
                    website_clicks: matchedVideo.website_clicks,
                    phone_number_clicks: matchedVideo.phone_number_clicks,
                    lead_submissions: matchedVideo.lead_submissions,
                    app_download_clicks: matchedVideo.app_download_clicks,
                    email_clicks: matchedVideo.email_clicks,
                    address_clicks: matchedVideo.address_clicks,
                    video_view_retention: matchedVideo.video_view_retention,
                    impression_sources: matchedVideo.impression_sources,
                    audience_types: matchedVideo.audience_types,
                    audience_genders: matchedVideo.audience_genders,
                    audience_countries: matchedVideo.audience_countries,
                    audience_cities: matchedVideo.audience_cities,
                    engagement_likes: matchedVideo.engagement_likes,
                  }
                : undefined,
              media: [
                {
                  url: matchedVideo.embed_url,
                  thumbnail_url: matchedVideo.thumbnail_url,
                },
              ],
            });
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
      console.error('Error matching TikTok Business videos by metadata');
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
   * Builds the fields list for API requests
   */
  private buildFieldsList(includeMetrics: boolean): string {
    const baseFields = [
      'item_id',
      'create_time',
      'thumbnail_url',
      'share_url',
      'embed_url',
      'caption',
    ];
    const metricsFields = [
      'video_views',
      'likes',
      'comments',
      'shares',
      'reach',
      'video_duration',
      'full_video_watched_rate',
      'total_time_watched',
      'average_time_watched',
      'impression_sources',
      'audience_countries',
    ];

    return includeMetrics
      ? `[${[...baseFields, ...metricsFields].map((m) => `"${m}"`).join(',')}]`
      : `[${baseFields.map((m) => `"${m}"`).join(',')}]`;
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
