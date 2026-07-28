import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { google } from 'googleapis';
import { SupabaseService } from '../supabase/supabase.service';
import { mapWithConcurrency } from '../lib/async.utils';

const YOUTUBE_METRICS_CONCURRENCY = 3;
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

const TRANSIENT_NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ERR_STREAM_PREMATURE_CLOSE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

interface YouTubeErrorMetadata {
  provider: 'youtube';
  operation: 'refreshAccessToken' | 'getAccountPosts';
  code?: string;
  status?: number;
  retryable: boolean;
  authFailure: boolean;
}

export class YouTubeError extends Error {
  readonly metadata: YouTubeErrorMetadata;
  readonly cause?: unknown;

  constructor(
    message: string,
    metadata: YouTubeErrorMetadata,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'YouTubeError';
    this.metadata = metadata;
    this.cause = cause;
  }
}

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
    channelId: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    favoriteCount: string;
    dislikeCount: string;
  };
}

interface YouTubeAnalyticsMetrics {
  engagedViews?: number;
  views?: number;
  redViews?: number;
  comments?: number;
  likes?: number;
  dislikes?: number;
  videosAddedToPlaylists?: number;
  videosRemovedFromPlaylists?: number;
  shares?: number;
  estimatedMinutesWatched?: number;
  estimatedRedMinutesWatched?: number;
  averageViewDuration?: number;
  averageViewPercentage?: number;
  annotationClickThroughRate?: number;
  annotationCloseRate?: number;
  annotationImpressions?: number;
  annotationClickableImpressions?: number;
  annotationClosableImpressions?: number;
  annotationClicks?: number;
  annotationCloses?: number;
  cardClickRate?: number;
  cardTeaserClickRate?: number;
  cardImpressions?: number;
  cardTeaserImpressions?: number;
  cardClicks?: number;
  cardTeaserClicks?: number;
  subscribersGained?: number;
  subscribersLost?: number;
}

@Injectable({ scope: Scope.REQUEST })
export class YouTubeService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  private oauth2Client: any = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  private getErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }

    return undefined;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    if (
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      typeof error.response.status === 'number'
    ) {
      return error.response.status;
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private isAuthFailure(error: unknown): boolean {
    const status = this.getErrorStatus(error);

    if (status === 400 || status === 401 || status === 403) {
      return true;
    }

    const message = this.getErrorMessage(error).toLowerCase();

    return (
      message.includes('invalid_grant') ||
      message.includes('invalid_client') ||
      message.includes('unauthorized_client') ||
      message.includes('invalid token')
    );
  }

  private isRetryableError(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    const code = this.getErrorCode(error);

    if (code && TRANSIENT_NETWORK_ERROR_CODES.has(code)) {
      return true;
    }

    if (status === undefined) {
      return false;
    }

    return status === 408 || status === 429 || (status >= 500 && status <= 599);
  }

  private hasUsableAccessToken(account: SocialAccount): boolean {
    if (!account.access_token) {
      return false;
    }

    if (!account.access_token_expires_at) {
      return true;
    }

    return (
      new Date(account.access_token_expires_at).getTime() - Date.now() >
      ACCESS_TOKEN_EXPIRY_SKEW_MS
    );
  }

  private toYouTubeError(
    message: string,
    operation: YouTubeErrorMetadata['operation'],
    error: unknown,
    authFailureOverride?: boolean,
    retryableOverride?: boolean,
    codeOverride?: string,
  ): YouTubeError {
    const metadata: YouTubeErrorMetadata = {
      provider: 'youtube',
      operation,
      code: codeOverride ?? this.getErrorCode(error),
      status: this.getErrorStatus(error),
      authFailure: authFailureOverride ?? this.isAuthFailure(error),
      retryable: retryableOverride ?? this.isRetryableError(error),
    };

    return new YouTubeError(message, metadata, error);
  }

  private isSuspendedAccountError(error: unknown): boolean {
    if (this.getErrorStatus(error) !== 403) {
      return false;
    }

    return this.getErrorMessage(error)
      .toLowerCase()
      .includes('youtube account of the authenticated user is suspended');
  }

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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.access_token_expires_at
        ? new Date(account.access_token_expires_at).getTime()
        : undefined,
    });

    if (!account.refresh_token) {
      if (this.hasUsableAccessToken(account)) {
        return account;
      }

      throw this.toYouTubeError(
        'Missing YouTube refresh token and access token is expired.',
        'refreshAccessToken',
        new Error('missing_refresh_token'),
        true,
        false,
      );
    }

    try {
      const refreshResponse =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        (await this.oauth2Client.refreshAccessToken()) as {
          credentials: {
            access_token?: string;
            refresh_token?: string;
            expiry_date?: number;
          };
        };
      const { credentials } = refreshResponse;

      if (!credentials.access_token) {
        throw this.toYouTubeError(
          'YouTube token refresh succeeded without access token.',
          'refreshAccessToken',
          new Error('missing_access_token'),
          true,
          false,
        );
      }

      account.access_token = credentials.access_token;
      account.refresh_token =
        credentials.refresh_token || account.refresh_token;

      if (credentials.expiry_date) {
        account.access_token_expires_at = new Date(credentials.expiry_date);
      }

      return account;
    } catch (error) {
      if (error instanceof YouTubeError) {
        throw error;
      }

      const wrappedError = this.toYouTubeError(
        `Failed to refresh YouTube access token: ${this.getErrorMessage(error)}`,
        'refreshAccessToken',
        error,
      );

      if (
        wrappedError.metadata.retryable &&
        this.hasUsableAccessToken(account)
      ) {
        console.warn(
          'Using existing YouTube access token after retryable refresh failure',
          {
            provider: wrappedError.metadata.provider,
            operation: wrappedError.metadata.operation,
            code: wrappedError.metadata.code,
            status: wrappedError.metadata.status,
            message: wrappedError.message,
          },
        );

        return account;
      }

      throw wrappedError;
    }
  }

  /**
   * Fetches analytics metrics for a specific video using YouTube Analytics API
   */
  private async getVideoAnalytics(
    videoId: string,
    publishedAt: string,
    channelId: string,
  ): Promise<YouTubeAnalyticsMetrics> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized.');
    }

    // Google API returns any type, which is unavoidable
    const youtubeAnalytics = google.youtubeAnalytics({
      version: 'v2',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      auth: this.oauth2Client,
    });

    try {
      // Format dates for all-time analytics
      const startDate = new Date(publishedAt).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics:
          'engagedViews,views,redViews,comments,likes,dislikes,videosAddedToPlaylists,videosRemovedFromPlaylists,shares,estimatedMinutesWatched,estimatedRedMinutesWatched,averageViewDuration,averageViewPercentage,annotationClickThroughRate,annotationCloseRate,annotationImpressions,annotationClickableImpressions,annotationClosableImpressions,annotationClicks,annotationCloses,cardClickRate,cardTeaserClickRate,cardImpressions,cardTeaserImpressions,cardClicks,cardTeaserClicks,subscribersGained,subscribersLost',
        filters: `video==${videoId}`,
      });

      // Parse the response data

      if (response.data.rows && response.data.rows.length > 0) {
        const row = response.data.rows[0];
        const headers = response.data.columnHeaders || [];

        const metrics: YouTubeAnalyticsMetrics = {};

        headers.forEach((header, index) => {
          const name = header.name as string;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const value = row[index];

          if (typeof value === 'number' || typeof value === 'string') {
            metrics[name as keyof YouTubeAnalyticsMetrics] =
              typeof value === 'string' ? parseFloat(value) : value;
          }
        });

        return metrics;
      }

      return {};
    } catch (error) {
      // Analytics API might fail due to permissions or video being too new
      console.warn(
        `Failed to fetch analytics for video ${videoId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {};
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
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized. Call initService first.');
    }

    // Set credentials for this request
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.access_token_expires_at
        ? new Date(account.access_token_expires_at).getTime()
        : undefined,
    });

    // Google API returns any type, which is unavoidable
    const youtube = google.youtube({
      version: 'v3',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      auth: this.oauth2Client,
    });

    const safeLimit = Math.min(limit, 50); // YouTube API max is 50

    try {
      let videos: YouTubeVideo[] = [];
      let nextPageToken: string | undefined;

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
          pageToken: cursor,
        });

        nextPageToken = playlistResponse.data.nextPageToken || undefined;

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

      // Fetch analytics for each video and combine with basic stats
      const posts = await mapWithConcurrency(
        videos,
        async (video): Promise<PlatformPost> => {
          const analyticsMetrics = includeMetrics
            ? await this.getVideoAnalytics(
                video.id,
                video.snippet.publishedAt,
                video.snippet.channelId,
              )
            : {};

          return {
            provider: 'youtube',
            id: video.id,
            account_id: account.social_provider_user_id,
            caption: video.snippet.description || video.snippet.title || '',
            platform_data: {
              title: video.snippet.title,
            },
            url: `https://www.youtube.com/watch?v=${video.id}`,
            posted_at: video.snippet.publishedAt,
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
            metrics: includeMetrics
              ? {
                  views:
                    analyticsMetrics.views ||
                    parseInt(video.statistics.viewCount || '0', 10),
                  likes:
                    analyticsMetrics.likes ||
                    parseInt(video.statistics.likeCount || '0', 10),
                  comments:
                    analyticsMetrics.comments ||
                    parseInt(video.statistics.commentCount || '0', 10),
                  dislikes:
                    analyticsMetrics.dislikes ||
                    parseInt(video.statistics.dislikeCount || '0', 10),
                  engagedViews: analyticsMetrics.engagedViews,
                  redViews: analyticsMetrics.redViews,
                  videosAddedToPlaylists:
                    analyticsMetrics.videosAddedToPlaylists,
                  videosRemovedFromPlaylists:
                    analyticsMetrics.videosRemovedFromPlaylists,
                  shares: analyticsMetrics.shares,
                  estimatedMinutesWatched:
                    analyticsMetrics.estimatedMinutesWatched,
                  estimatedRedMinutesWatched:
                    analyticsMetrics.estimatedRedMinutesWatched,
                  averageViewDuration: analyticsMetrics.averageViewDuration,
                  averageViewPercentage: analyticsMetrics.averageViewPercentage,
                  annotationClickThroughRate:
                    analyticsMetrics.annotationClickThroughRate,
                  annotationCloseRate: analyticsMetrics.annotationCloseRate,
                  annotationImpressions: analyticsMetrics.annotationImpressions,
                  annotationClickableImpressions:
                    analyticsMetrics.annotationClickableImpressions,
                  annotationClosableImpressions:
                    analyticsMetrics.annotationClosableImpressions,
                  annotationClicks: analyticsMetrics.annotationClicks,
                  annotationCloses: analyticsMetrics.annotationCloses,
                  cardClickRate: analyticsMetrics.cardClickRate,
                  cardTeaserClickRate: analyticsMetrics.cardTeaserClickRate,
                  cardImpressions: analyticsMetrics.cardImpressions,
                  cardTeaserImpressions: analyticsMetrics.cardTeaserImpressions,
                  cardClicks: analyticsMetrics.cardClicks,
                  cardTeaserClicks: analyticsMetrics.cardTeaserClicks,
                  subscribersGained: analyticsMetrics.subscribersGained,
                  subscribersLost: analyticsMetrics.subscribersLost,
                }
              : undefined,
          };
        },
        includeMetrics ? YOUTUBE_METRICS_CONCURRENCY : 8,
      );

      return {
        posts,
        count: posts.length,
        has_more: posts.length === safeLimit,
        cursor: nextPageToken,
      };
    } catch (error) {
      if (error instanceof YouTubeError) {
        throw error;
      }

      if (error instanceof Error) {
        console.error('Error fetching YouTube posts', {
          message: error.message,
          code: this.getErrorCode(error),
          status: this.getErrorStatus(error),
        });
      } else {
        console.error('Error fetching YouTube posts', {
          error: this.getErrorMessage(error),
        });
      }

      if (this.isSuspendedAccountError(error)) {
        throw this.toYouTubeError(
          'The connected YouTube account is suspended and its videos cannot be retrieved.',
          'getAccountPosts',
          error,
          true,
          false,
          'account_suspended',
        );
      }

      throw this.toYouTubeError(
        `Failed to fetch YouTube posts: ${this.getErrorMessage(error)}`,
        'getAccountPosts',
        error,
      );
    }
  }
}
