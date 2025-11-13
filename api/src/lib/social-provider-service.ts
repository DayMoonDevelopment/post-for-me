import type {
  SocialProviderAppCredentials,
  SocialAccount,
} from './dto/global.dto';

export interface SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  refreshAccessToken(account: SocialAccount): void;

  getAccountPosts({
    account,
    platformIds,
  }: {
    account: SocialAccount;
    platformIds?: string[];
  }): Promise<string>;
}
