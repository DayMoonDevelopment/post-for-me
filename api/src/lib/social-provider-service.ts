import type { PlatformPostsResponse, SocialAccount } from './dto/global.dto';

export interface SocialPlatformService {
  initService(projectId: string): Promise<void>;

  refreshAccessToken(account: SocialAccount): Promise<SocialAccount | null>;

  getAccountPosts({
    account,
    platformIds,
    limit,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    limit: number;
  }): Promise<PlatformPostsResponse>;
}
