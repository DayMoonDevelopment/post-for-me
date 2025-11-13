import { Injectable } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';

@Injectable()
export class TikTokBusinessService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(appCredentials: SocialProviderAppCredentials) {
    this.appCredentials = appCredentials;
  }

  refreshAccessToken(account: SocialAccount): void {
    console.log(account);

    throw new Error('Method not implemented.');
  }

  getAccountPosts({
    account,
    platformIds,
  }: {
    account: SocialAccount;
    platformIds?: string[];
  }): Promise<string> {
    console.log(account, platformIds);

    throw new Error('Method not implemented.');
  }
}
