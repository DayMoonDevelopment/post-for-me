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

  private getListOrSingleQueryParam(paramName: string, urns: string[]): string {
    if (urns.length === 1) {
      return `${paramName}=${encodeURIComponent(urns[0])}`;
    }

    const encodedIds = urns.map((urn) => encodeURIComponent(urn)).join('%2C');
    return `${paramName}=List(${encodedIds})`;
  }

  private toLinkedInMetrics(stats: any): LinkedInPostMetricsDto {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    return {
      clickCount: stats.clickCount,
      commentCount: stats.commentCount,
      engagement: stats.engagement,
      impressionCount: stats.impressionCount,
      likeCount: stats.likeCount,
      shareCount: stats.shareCount,
    };
  }

  private async getOrganizationalEntityShareStatistics(params: {
    account: SocialAccount;
    authorUrn: string;
    urns: string[];
    urnParamName: 'shares' | 'ugcPosts';
  }): Promise<Map<string, LinkedInPostMetricsDto>> {
    const { account, authorUrn, urns, urnParamName } = params;
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

    const metricsByUrn = new Map<string, LinkedInPostMetricsDto>();
    if (urns.length === 0) {
      return metricsByUrn;
    }

    const urnParam = this.getListOrSingleQueryParam(urnParamName, urns);
    const analyticsUrl = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${authorUrn}&${urnParam}`;
    const analyticsResponse = await fetch(analyticsUrl, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Linkedin-Version': this.apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    const analyticsData: any = await analyticsResponse.json();
    if (!analyticsResponse.ok) {
      console.error('Error getting post analytics', analyticsData);
      return metricsByUrn;
    }

    const elements = Array.isArray(analyticsData?.elements)
      ? analyticsData.elements
      : analyticsData
        ? [analyticsData]
        : [];

    for (const element of elements) {
      const urn: string | undefined =
        element?.share || element?.ugcPost || element?.id || element?.urn;
      const stats: any = element?.totalShareStatistics;

      if (!urn || !stats) {
        continue;
      }

      metricsByUrn.set(urn, this.toLinkedInMetrics(stats));
    }

    // Some LinkedIn responses (especially when requesting a single ID) may
    // return a stats object without the URN included. If we only asked for one
    // URN and didn't get a mappable element, attach the stats to the request URN.
    if (metricsByUrn.size === 0 && urns.length === 1) {
      const stats: any = analyticsData?.totalShareStatistics || analyticsData;
      if (stats?.clickCount !== undefined) {
        metricsByUrn.set(urns[0], this.toLinkedInMetrics(stats));
      }
    }

    return metricsByUrn;
  }

  private async getVideoMetrics(
    account: SocialAccount,
    postUrn: string,
  ): Promise<
    | {
        videoPlay?: number;
        videoViewer?: number;
        videoWatchTime?: number;
      }
    | undefined
  > {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    const videoAnalyticsUrl = `https://api.linkedin.com/rest/memberCreatorVideoAnalytics?q=entity&entity=${encodeURIComponent(postUrn)}`;
    const videoResponse = await fetch(videoAnalyticsUrl, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Linkedin-Version': this.apiVersion,
      },
    });

    const videoData: any = await videoResponse.json();
    if (!videoResponse.ok) {
      console.error('Error getting video metrics', videoData);
      return undefined;
    }

    return {
      videoPlay: videoData.views?.[0]?.totalViews,
      videoViewer: videoData.views?.[0]?.uniqueViews,
      videoWatchTime: videoData.views?.[0]?.totalWatchTime,
    };
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

      const postIds = posts.map((p) => (p.id || p.urn) as string);
      const shareUrns: string[] = postIds.filter((id) => id.includes('share'));
      const ugcUrns: string[] = postIds.filter((id) => id.includes('ugcPost'));

      const metricsByUrn = new Map<string, LinkedInPostMetricsDto>();
      if (includeMetrics) {
        const [sharesMap, ugcMap] = await Promise.all([
          this.getOrganizationalEntityShareStatistics({
            account,
            authorUrn: encodedAuthorUrn,
            urns: shareUrns,
            urnParamName: 'shares',
          }),
          this.getOrganizationalEntityShareStatistics({
            account,
            authorUrn: encodedAuthorUrn,
            urns: ugcUrns,
            urnParamName: 'ugcPosts',
          }),
        ]);

        for (const [urn, metrics] of sharesMap.entries()) {
          metricsByUrn.set(urn, metrics);
        }
        for (const [urn, metrics] of ugcMap.entries()) {
          metricsByUrn.set(urn, metrics);
        }
      }

      const platformPostsPromises = posts.map(async (post) => {
        const postUrn: string = post.id || post.urn;
        const content = post.content;
        const createdObj = post.created;

        const metrics = includeMetrics ? metricsByUrn.get(postUrn) : undefined;

        // Check if post has video
        if (
          includeMetrics &&
          metrics &&
          content?.['com.linkedin.ugc.ShareContent']?.media?.[0]?.[
            'com.linkedin.ugc.Media'
          ]?.mediaType === 'urn:li:digitalmediaMediaType:video'
        ) {
          const videoMetrics = await this.getVideoMetrics(account, postUrn);
          if (videoMetrics) {
            metrics.videoPlay = videoMetrics.videoPlay;
            metrics.videoViewer = videoMetrics.videoViewer;
            metrics.videoWatchTime = videoMetrics.videoWatchTime;
          }
        }

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
