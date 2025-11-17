import type { PlatformPost, SocialAccount } from './dto/global.dto';

export interface SocialPlatformService {
  initService(projectId: string): Promise<void>;

  refreshAccessToken(account: SocialAccount): Promise<SocialAccount | null>;

  getAccountPosts({
    account,
    platformIds,
  }: {
    account: SocialAccount;
    platformIds?: string[];
  }): Promise<PlatformPost>;
}
