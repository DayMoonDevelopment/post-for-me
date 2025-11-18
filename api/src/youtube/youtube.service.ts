import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { SupabaseService } from '../supabase/supabase.service';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    favoriteCount: string;
    dislikeCount: string;
  };
}

@Injectable({ scope: Scope.REQUEST })
export class YouTubeService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  private oauth2Client: OAuth2Client | null = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'youtube')
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

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      this.appCredentials.appId,
      this.appCredentials.appSecret,
      `${process.env.NEXTAUTH_URL}/api/youtube-auth/callback`,
    );
  }

  async refreshAccessToken(account: SocialAccount): Promise<SocialAccount> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized. Call initService first.');
    }

    this.oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.access_token_expires_at
        ? new Date(account.access_token_expires_at).getTime()
        : undefined,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    account.access_token = credentials.access_token;
    account.refresh_token = credentials.refresh_token || account.refresh_token;

    if (credentials.expiry_date) {
      account.access_token_expires_at = new Date(credentials.expiry_date);
    }

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
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized. Call initService first.');
    }

    // Set credentials for this request
    this.oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.access_token_expires_at
        ? new Date(account.access_token_expires_at).getTime()
        : undefined,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    const safeLimit = Math.min(limit, 50); // YouTube API max is 50

    try {
      let videos: YouTubeVideo[] = [];

      if (platformIds && platformIds.length > 0) {
        // Fetch specific videos by ID
        const response = await youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: platformIds,
          maxResults: safeLimit,
        });

        videos = (response.data.items || []) as YouTubeVideo[];
      } else {
        // Fetch channel's uploads
        // First, get the channel's upload playlist ID
        const channelResponse = await youtube.channels.list({
          part: ['contentDetails'],
          mine: true,
        });

        const uploadPlaylistId =
          channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists
            ?.uploads;

        if (!uploadPlaylistId) {
          return {
            posts: [],
            count: 0,
            has_more: false,
          };
        }

        // Get videos from uploads playlist
        const playlistResponse = await youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: uploadPlaylistId,
          maxResults: safeLimit,
        });

        const videoIds = playlistResponse.data.items
          ?.map((item) => item.snippet?.resourceId?.videoId)
          .filter(Boolean) as string[];

        if (videoIds.length === 0) {
          return {
            posts: [],
            count: 0,
            has_more: false,
          };
        }

        // Fetch video details with statistics
        const videosResponse = await youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: videoIds,
        });

        videos = (videosResponse.data.items || []) as YouTubeVideo[];
      }

      const posts: PlatformPost[] = videos.map((video) => ({
        provider: 'youtube',
        id: video.id,
        account_id: account.social_provider_user_id,
        caption: video.snippet.title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        media: [
          {
            url: `https://www.youtube.com/embed/${video.id}`,
            thumbnail_url:
              video.snippet.thumbnails.high?.url ||
              video.snippet.thumbnails.medium?.url ||
              video.snippet.thumbnails.default?.url ||
              '',
          },
        ],
        metrics: {
          likeCount: parseInt(video.statistics.likeCount || '0', 10),
          commentCount: parseInt(video.statistics.commentCount || '0', 10),
          favoriteCount: parseInt(video.statistics.favoriteCount || '0', 10),
          viewCount: parseInt(video.statistics.viewCount || '0', 10),
          dislikeCount: parseInt(video.statistics.dislikeCount || '0'),
        },
      }));

      return {
        posts,
        count: posts.length,
        has_more: posts.length === safeLimit,
      };
    } catch (error) {
      console.error('Error fetching YouTube posts:', error);
      throw new Error(
        `Failed to fetch YouTube posts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
