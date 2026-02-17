import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
} from '../lib/dto/global.dto';
import { AtpAgent } from '@atproto/api';

import { AppLogger } from '../logger/app-logger';

@Injectable({ scope: Scope.REQUEST })
export class BlueskyService implements SocialPlatformService {
  private agent: AtpAgent;

  constructor(private readonly logger: AppLogger) {
    this.agent = new AtpAgent({
      service: 'https://bsky.social',
    });
  }

  async initService(): Promise<void> {}

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
      this.logger.warnWithMeta(
        'bluesky resume session failed; falling back to login',
        {
          accountId: account.id,
          error,
        },
      );

      // Try to login with app password
      const accountMeatadata = account.social_provider_metadata as {
        bluesky_app_password: string;
      };
      await this.agent.login({
        identifier: account.social_provider_user_name || '',
        password: accountMeatadata?.bluesky_app_password || '',
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
    cursor,
    includeMetrics = false,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    platformPostsMetadata?: any;
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
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
        const safeIds = platformIds.slice(0, 25);
        const postsResponse = await this.agent.getPosts({
          uris: safeIds,
        });

        const posts: PlatformPost[] = postsResponse.data.posts.map((post) => ({
          provider: 'bluesky',
          id: post.uri,
          account_id: post.author.did,
          caption: (post.record as { text?: string })?.text || '',
          url: `https://bsky.app/profile/${post.author.did}/post/${post.uri.split('/').pop()}`,
          media: [],
          metrics: includeMetrics
            ? {
                replyCount: post.replyCount || 0,
                likeCount: post.likeCount || 0,
                repostCount: post.repostCount || 0,
                quoteCount: post.quoteCount || 0,
              }
            : undefined,
        }));

        return {
          posts,
          count: posts.length,
          has_more: false,
        };
      }

      // Get author's feed
      const feed = await this.agent.getAuthorFeed({
        actor: account.social_provider_user_id,
        limit: safeLimit,
        cursor: cursor,
      });

      const posts: PlatformPost[] = feed.data.feed.map((item) => {
        const post = item.post;
        return {
          provider: 'bluesky',
          id: post.uri,
          account_id: post.author.did,
          caption: (post.record as { text?: string })?.text || '',
          url: `https://bsky.app/profile/${post.author.did}/post/${post.uri.split('/').pop()}`,
          media: [],
          metrics: includeMetrics
            ? {
                replyCount: post.replyCount || 0,
                likeCount: post.likeCount || 0,
                repostCount: post.repostCount || 0,
                quoteCount: post.quoteCount || 0,
              }
            : undefined,
        };
      });

      return {
        posts,
        count: posts.length,
        has_more: !!feed.data.cursor,
        cursor: feed.data.cursor,
      };
    } catch (error) {
      this.logger.errorWithMeta('bluesky posts fetch failed', error, {
        accountId: account.id,
        includeMetrics,
      });
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
