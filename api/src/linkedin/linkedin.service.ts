import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { LinkedInPostMetricsDto } from './dto/linkedin-post-metrics.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';

type LinkedInBatchGetResponse<T> = {
  results?: Record<string, T>;
};

type LinkedInImageEntity = {
  downloadUrl?: string;
};

type LinkedInVideoEntity = {
  downloadUrl?: string;
  thumbnail?: string;
};

type LinkedInVideoAnalyticsType =
  | 'VIDEO_VIEW'
  | 'VIEWER'
  | 'TIME_WATCHED'
  | 'TIME_WATCHED_FOR_VIDEO_VIEWS';

type LinkedInVideoAnalyticsResponse = {
  elements?: Array<{
    value?: unknown;
  }>;
};

type LinkedInPostElement = {
  content?: {
    media?: {
      id?: string;
    };
  };
};

@Injectable({ scope: Scope.REQUEST })
export class LinkedInService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  apiVersion: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.apiVersion =
      this.configService.get<string>('LinkedInVersion') || '202601';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRestHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Linkedin-Version': this.apiVersion,
    };
  }

  private getMediaTypeFromUrn(mediaUrn: string): 'image' | 'video' | undefined {
    const urn = mediaUrn.toLowerCase();
    if (urn.includes(':image:')) {
      return 'image';
    }
    if (urn.includes(':video:')) {
      return 'video';
    }
    return undefined;
  }

  private async batchGetImages(
    account: SocialAccount,
    imageUrns: string[],
  ): Promise<Map<string, { url: string; thumbnail_url?: string }>> {
    const resolved = new Map<string, { url: string; thumbnail_url?: string }>();

    if (imageUrns.length === 0) {
      return resolved;
    }

    const encodedIds = imageUrns.map((id) => encodeURIComponent(id)).join(',');
    const url = `https://api.linkedin.com/rest/images?ids=List(${encodedIds})`;
    const response = await fetch(url, {
      headers: {
        ...this.getRestHeaders(account.access_token),
        'X-RestLi-Method': 'BATCH_GET',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    const data =
      (await response.json()) as unknown as LinkedInBatchGetResponse<LinkedInImageEntity>;
    if (!response.ok) {
      console.error('Error batch getting LinkedIn images', data);
      return resolved;
    }

    const results = data.results;
    if (!results) {
      return resolved;
    }

    for (const [urn, value] of Object.entries(results)) {
      const downloadUrl = value?.downloadUrl;
      if (typeof downloadUrl === 'string' && downloadUrl.length > 0) {
        resolved.set(urn, {
          url: downloadUrl,
          thumbnail_url: downloadUrl,
        });
      }
    }

    return resolved;
  }

  private async batchGetVideos(
    account: SocialAccount,
    videoUrns: string[],
  ): Promise<Map<string, { url: string; thumbnail_url?: string }>> {
    const resolved = new Map<string, { url: string; thumbnail_url?: string }>();

    if (videoUrns.length === 0) {
      return resolved;
    }

    const encodedIds = videoUrns.map((id) => encodeURIComponent(id)).join(',');
    const url = `https://api.linkedin.com/rest/videos?ids=List(${encodedIds})`;
    const response = await fetch(url, {
      headers: {
        ...this.getRestHeaders(account.access_token),
        'X-Restli-Protocol-Version': '2.0.0',
        'X-RestLi-Method': 'BATCH_GET',
      },
    });

    const data =
      (await response.json()) as unknown as LinkedInBatchGetResponse<LinkedInVideoEntity>;
    if (!response.ok) {
      console.error('Error batch getting LinkedIn videos', data);
      return resolved;
    }

    const results = data.results;
    if (!results) {
      return resolved;
    }

    for (const [urn, value] of Object.entries(results)) {
      const downloadUrl = value?.downloadUrl;
      const thumbnail = value?.thumbnail;
      if (typeof downloadUrl === 'string' && downloadUrl.length > 0) {
        resolved.set(urn, {
          url: downloadUrl,
          thumbnail_url: typeof thumbnail === 'string' ? thumbnail : undefined,
        });
      }
    }

    return resolved;
  }

  private async resolvePostMediaFromContent(
    account: SocialAccount,
    posts: LinkedInPostElement[],
  ): Promise<Map<string, { url: string; thumbnail_url?: string }>> {
    const imageUrns = new Set<string>();
    const videoUrns = new Set<string>();

    for (const post of posts) {
      const mediaId = post.content?.media?.id;
      if (typeof mediaId !== 'string' || mediaId.length === 0) {
        continue;
      }

      const mediaType = this.getMediaTypeFromUrn(mediaId);
      if (mediaType === 'image') {
        imageUrns.add(mediaId);
      } else if (mediaType === 'video') {
        videoUrns.add(mediaId);
      }
    }

    const [images, videos] = await Promise.all([
      this.batchGetImages(account, [...imageUrns]),
      this.batchGetVideos(account, [...videoUrns]),
    ]);

    const resolved = new Map<string, { url: string; thumbnail_url?: string }>();
    for (const [k, v] of images.entries()) {
      resolved.set(k, v);
    }
    for (const [k, v] of videos.entries()) {
      resolved.set(k, v);
    }

    return resolved;
  }

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'linkedin')
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
    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token || '',
        client_id: this.appCredentials.appId,
        client_secret: this.appCredentials.appSecret,
      }),
    });

    const data = (await response.json()) as {
      error_description?: string;
      expires_in?: number;
      access_token?: string;
    };

    if (!response.ok) {
      throw new Error(
        `Failed to refresh LinkedIn token: ${data.error_description || 'Unknown error'}`,
      );
    }

    if (!data.access_token || !data.expires_in) {
      throw new Error('Invalid response from LinkedIn token endpoint');
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() - 300);

    account.access_token = data.access_token;
    account.access_token_expires_at = newExpiresAt;

    return account;
  }

  private async getPostMetrics(
    account: SocialAccount,
    postUrn: string,
    content: any,
    authorUrn: string,
  ): Promise<LinkedInPostMetricsDto | undefined> {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

    const urnPrefix: string = postUrn.includes('ugcPost')
      ? 'ugcPosts'
      : 'shares';

    // Fetch post analytics
    const analyticsUrl = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${authorUrn}&${urnPrefix}=${encodeURIComponent(postUrn)}`;
    const analyticsResponse = await fetch(analyticsUrl, {
      headers: {
        ...this.getRestHeaders(account.access_token),
      },
    });

    let metrics: LinkedInPostMetricsDto = {};
    const analyticsData: any = await analyticsResponse.json();

    if (!analyticsResponse.ok) {
      console.error('Error getting LinkedIn Post metrics', analyticsData);
    } else {
      const stats = Array.isArray(analyticsData?.elements)
        ? analyticsData.elements?.[0]?.totalShareStatistics
        : analyticsData;

      if (!stats) {
        return undefined;
      }

      metrics = {
        clickCount: stats.clickCount,
        commentCount: stats.commentCount,
        engagement: stats.engagement,
        impressionCount: stats.impressionCount,
        likeCount: stats.likeCount,
        shareCount: stats.shareCount,
      };
    }

    const contentMediaId: unknown = content?.media?.id;
    const hasVideo =
      (typeof contentMediaId === 'string' &&
        this.getMediaTypeFromUrn(contentMediaId) === 'video') ||
      content?.['com.linkedin.ugc.ShareContent']?.media?.[0]?.[
        'com.linkedin.ugc.Media'
      ]?.mediaType === 'urn:li:digitalmediaMediaType:video';

    // Check if post has video
    if (hasVideo) {
      const fetchMetric = async (
        type: LinkedInVideoAnalyticsType,
      ): Promise<number | undefined> => {
        const videoAnalyticsUrl = `https://api.linkedin.com/rest/videoAnalytics?q=entity&entity=${encodeURIComponent(
          postUrn,
        )}&aggregation=ALL&type=${type}`;
        const videoResponse = await fetch(videoAnalyticsUrl, {
          headers: {
            ...this.getRestHeaders(account.access_token),
          },
        });

        const videoData =
          (await videoResponse.json()) as unknown as LinkedInVideoAnalyticsResponse;
        if (!videoResponse.ok) {
          console.error('Error getting LinkedIn video metric', {
            postUrn,
            type,
            videoData,
          });
          return undefined;
        }

        const value = videoData.elements?.[0]?.value;
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
      };

      const [videoView, viewer, timeWatched, timeWatchedForVideoViews] =
        await Promise.all([
          fetchMetric('VIDEO_VIEW'),
          fetchMetric('VIEWER'),
          fetchMetric('TIME_WATCHED'),
          fetchMetric('TIME_WATCHED_FOR_VIDEO_VIEWS'),
        ]);

      metrics.videoView = videoView;
      metrics.viewer = viewer;
      metrics.timeWatched = timeWatched;
      metrics.timeWatchedForVideoViews = timeWatchedForVideoViews;
    }

    return metrics;
  }

  async getAccountPosts(params: {
    account: SocialAccount;
    platformIds?: string[];
    platformPostsMetadata?: any;
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    const { account, platformIds, includeMetrics } = params;
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    try {
      let posts: any[] = [];
      let paging: any = {};
      let isBatch = false;
      const metadata = account.social_provider_metadata as {
        connection_type?: string;
      };
      const authorUrn =
        metadata?.connection_type === 'page'
          ? `urn:li:organization:${account.social_provider_user_id}`
          : `urn:li:person:${account.social_provider_user_id}`;

      const encodedAuthorUrn = encodeURIComponent(authorUrn);

      if (platformIds && platformIds.length > 0) {
        // Fetch specific posts using Batch Get Posts method
        const encodedIds = platformIds
          .map((id) => encodeURIComponent(id))
          .join(',');
        const url = `https://api.linkedin.com/rest/posts?ids=List(${encodedIds})`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'X-RestLi-Method': 'BATCH_GET',
            'Linkedin-Version': this.apiVersion,
          },
        });

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        posts = data.elements || [];
        isBatch = true;
      } else {
        let url = `https://api.linkedin.com/rest/posts?author=${encodedAuthorUrn}&q=author`;
        if (params.cursor) {
          url += `&start=${encodeURIComponent(params.cursor)}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Linkedin-Version': this.apiVersion,
          },
        });

        const data: any = await response.json();
        if (!response.ok) {
          console.error('Error fetching LinkedIn API posts', data);
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        posts = data.elements || [];
        paging = data.paging || {};
      }

      const totalCount = isBatch ? posts.length : paging.count || posts.length;
      const cursor = isBatch ? undefined : paging.start;

      // Resolve media from the modern Posts API response shape:
      //   { content: { media: { id: 'urn:li:image:...' | 'urn:li:video:...' } } }
      const resolvedContentMedia = await this.resolvePostMediaFromContent(
        account,
        posts as LinkedInPostElement[],
      );

      const platformPostsPromises = posts.map(async (post, index) => {
        const postUrn: string = post.id || post.urn;
        const content = post.content;
        const createdObj = post.created;

        // Stagger metrics requests slightly so we don't fan out a burst of
        // requests at the exact same time.
        if (includeMetrics) {
          const baseDelayMs = 150;
          const maxDelayMs = 2000;
          const delayMs = Math.min(index * baseDelayMs, maxDelayMs);
          if (delayMs > 0) {
            await this.sleep(delayMs);
          }
        }

        const metrics = includeMetrics
          ? await this.getPostMetrics(
              account,
              postUrn,
              content,
              encodedAuthorUrn,
            )
          : undefined;

        const media = [];

        const contentMediaId: unknown = content?.media?.id;
        if (typeof contentMediaId === 'string') {
          const resolved = resolvedContentMedia.get(contentMediaId);
          if (resolved) {
            media.push(resolved);
          }
        }

        if (content?.['com.linkedin.ugc.ShareContent']?.media) {
          for (const mediaItem of content['com.linkedin.ugc.ShareContent']
            .media) {
            const mediaObj = mediaItem['com.linkedin.ugc.Media'];
            if (mediaObj?.thumbnails) {
              const url = mediaObj.thumbnails[0].url;
              if (
                typeof url === 'string' &&
                url.length > 0 &&
                !media.some((m) => m.url === url)
              ) {
                media.push({
                  url,
                  thumbnail_url: url,
                });
              }
            }
          }
        }

        return {
          provider: 'linkedin',
          id: postUrn,
          account_id: account.id,
          caption: post.commentary || '',
          url: `https://www.linkedin.com/posts/${postUrn.split(':').pop()}`,
          posted_at: createdObj?.time,
          media,
          metrics,
        };
      });

      const platformPosts = await Promise.all(platformPostsPromises);

      return {
        posts: platformPosts as any,
        count: posts.length,
        cursor,
        has_more: totalCount > posts.length,
      };
    } catch (error) {
      console.error('Error fetching LinkedIn posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
