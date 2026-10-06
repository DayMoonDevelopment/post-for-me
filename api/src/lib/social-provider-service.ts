import type {
  PlatformPostsResponse,
  SocialAccount,
  PlatformPostMetadata,
} from './dto/global.dto';
import type {
  GetPlatformAudioParams,
  PlatformAudioResponseDto,
} from './dto/platform-audio.dto';

export interface SocialPlatformService {
  /** Unsupported platforms reject with HttpException (HTTP 400), preserving its message. */
  getPlatformAudio(
    params: GetPlatformAudioParams,
  ): Promise<PlatformAudioResponseDto>;

  initService(projectId: string): Promise<void>;

  refreshAccessToken(account: SocialAccount): Promise<SocialAccount | null>;

  getAccountPosts({
    account,
    platformIds,
    platformPostsMetadata,
    limit,
    cursor,
    includeMetrics,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    platformPostsMetadata?: PlatformPostMetadata[];
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse>;
}
