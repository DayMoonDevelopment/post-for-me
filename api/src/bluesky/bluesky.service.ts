import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { AtpAgent } from '@atproto/api';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ scope: Scope.REQUEST })
export class BlueskyService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  private agent: AtpAgent;

  constructor(private readonly supabaseService: SupabaseService) {
    this.agent = new AtpAgent({
      service: 'https://bsky.social',
    });
  }

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'bluesky')
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
      await this.agent.resumeSession({
        accessJwt: account.access_token,
        refreshJwt: account.refresh_token || '',
        handle: account.social_provider_user_name || '',
        did: account.social_provider_user_id,
        active: true,
      });

      return account;
    } catch (error) {
      console.error('Failed to resume Bluesky session', error);

      // Try to login with app password
      await this.agent.login({
        identifier: account.social_provider_user_name || '',
        password: account.social_provider_metadata?.bluesky_app_password || '',
      });

      account.access_token =
        this.agent.session?.accessJwt || account.access_token;
      account.refresh_token =
        this.agent.session?.refreshJwt || account.refresh_token;
      account.access_token_expires_at = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 365,
      );

      return account;
    }
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
      const safeLimit = Math.min(limit, 50);

      // Resume session
      await this.agent.resumeSession({
        accessJwt: account.access_token,
        refreshJwt: account.refresh_token || '',
        handle: account.social_provider_user_name || '',
        did: account.social_provider_user_id,
        active: true,
      });

      if (platformIds && platformIds.length > 0) {
        // Bluesky uses URIs for posts, not simple IDs
        // This would need proper AT Protocol URI handling
        return {
          posts: [],
          count: 0,
          has_more: false,
        };
      }

      // Get author's feed
      const feed = await this.agent.getAuthorFeed({
        actor: account.social_provider_user_id,
        limit: safeLimit,
      });

      const posts: PlatformPost[] = feed.data.feed.map((item) => {
        const post = item.post;
        return {
          provider: 'bluesky',
          id: post.uri,
          account_id: account.social_provider_user_id,
          caption: (post.record as any)?.text || '',
          url: `https://bsky.app/profile/${account.social_provider_user_id}/post/${post.uri.split('/').pop()}`,
          media: [],
          metrics: {
            likes: post.likeCount || 0,
            comments: post.replyCount || 0,
            shares: post.repostCount || 0,
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
      });

      return {
        posts,
        count: posts.length,
        has_more: !!feed.data.cursor,
        cursor: feed.data.cursor,
      };
    } catch (error) {
      console.error('Error fetching Bluesky posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
