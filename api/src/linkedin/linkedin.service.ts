import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { LinkedInPostMetricsDto } from './dto/linkedin-post-metrics.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ scope: Scope.REQUEST })
export class LinkedInService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

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
  ): Promise<LinkedInPostMetricsDto | undefined> {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    // Fetch post analytics
    const analyticsUrl = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=entity&entity=${encodeURIComponent(postUrn)}`;
    const analyticsResponse = await fetch(analyticsUrl, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
      },
    });

    let metrics: LinkedInPostMetricsDto | undefined;
    if (analyticsResponse.ok) {
      const analyticsData: any = await analyticsResponse.json();
      metrics = {
        impression: analyticsData.impressionCount,
        membersReached: analyticsData.uniqueImpressionsCount,
        reshare: analyticsData.shareCount,
        reaction: analyticsData.likeCount,
        comment: analyticsData.commentCount,
      };
    }

    // Check if post has video
    if (
      content?.['com.linkedin.ugc.ShareContent']?.media?.[0]?.[
        'com.linkedin.ugc.Media'
      ]?.mediaType === 'urn:li:digitalmediaMediaType:video'
    ) {
      const videoAnalyticsUrl = `https://api.linkedin.com/rest/memberCreatorVideoAnalytics?q=entity&entity=${encodeURIComponent(postUrn)}`;
      const videoResponse = await fetch(videoAnalyticsUrl, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      });

      if (videoResponse.ok) {
        const videoData: any = await videoResponse.json();
        if (metrics) {
          metrics.videoPlay = videoData.views?.[0]?.totalViews;
          metrics.videoViewer = videoData.views?.[0]?.uniqueViews;
          metrics.videoWatchTime = videoData.views?.[0]?.totalWatchTime;
        }
      }
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
          },
        });

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        posts = data.elements || [];
        isBatch = true;
      } else {
        const metadata = account.social_provider_metadata as {
          connection_type?: string;
        };
        const authorUrn =
          metadata?.connection_type === 'page'
            ? `urn:li:company:${account.social_provider_user_id}`
            : `urn:li:person:${account.social_provider_user_id}`;

        const encodedAuthorUrn = encodeURIComponent(authorUrn);
        let url = `https://api.linkedin.com/rest/posts?author=${encodedAuthorUrn}`;
        if (params.cursor) {
          url += `&start=${encodeURIComponent(params.cursor)}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        posts = data.elements || [];
        paging = data.paging || {};
      }

      const totalCount = isBatch ? posts.length : paging.count || posts.length;
      const cursor = isBatch ? undefined : paging.start;

      const platformPostsPromises = posts.map(async (post) => {
        const postUrn: string = post.id || post.urn;
        const content = post.content;
        const textObj = post.text;
        const createdObj = post.created;

        const metrics = includeMetrics
          ? await this.getPostMetrics(account, postUrn, content)
          : undefined;

        const media = [];
        if (content?.['com.linkedin.ugc.ShareContent']?.media) {
          for (const mediaItem of content['com.linkedin.ugc.ShareContent']
            .media) {
            const mediaObj = mediaItem['com.linkedin.ugc.Media'];
            if (mediaObj?.thumbnails) {
              media.push({
                url: mediaObj.thumbnails[0].url,
                thumbnail_url: mediaObj.thumbnails[0].url,
              });
            }
          }
        }

        return {
          provider: 'linkedin',
          id: postUrn,
          account_id: account.id,
          caption: textObj?.text || '',
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
