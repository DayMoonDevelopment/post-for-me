import type {
  PlatformPostsResponse,
  SocialAccount,
  PlatformPostMetadata,
} from './dto/global.dto';

export interface SocialPlatformService {
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
