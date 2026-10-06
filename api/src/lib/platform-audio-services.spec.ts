import { HttpException, HttpStatus } from '@nestjs/common';
import { BlueskyService } from '../bluesky/bluesky.service';
import { FacebookService } from '../facebook/facebook.service';
import { InstagramService } from '../instagram/instagram.service';
import { LinkedInService } from '../linkedin/linkedin.service';
import { PinterestService } from '../pinterest/pinterest.service';
import { ThreadsService } from '../threads/threads.service';
import { TikTokService } from '../tiktok/tiktok.service';
import { TwitterService } from '../twitter/twitter.service';
import { YouTubeService } from '../youtube/youtube.service';
import type { SocialPlatformService } from './social-provider-service';
import type { SocialAccount } from './dto/global.dto';

describe('explicit unsupported platform audio implementations', () => {
  const account: SocialAccount = {
    provider: 'instagram',
    id: 'account',
    social_provider_user_name: null,
    access_token: 'secret',
    refresh_token: null,
    access_token_expires_at: null,
    refresh_token_expires_at: null,
    social_provider_user_id: 'user',
    social_provider_metadata: {},
  };
  const implementations: { name: string; prototype: SocialPlatformService }[] =
    [
      BlueskyService,
      FacebookService,
      InstagramService,
      LinkedInService,
      PinterestService,
      ThreadsService,
      TikTokService,
      TwitterService,
      YouTubeService,
    ];

  it.each(implementations)(
    '$name rejects with a user-visible HTTP 400',
    async (implementation) => {
      // The stub must not need initialization, account credentials, or provider requests.
      expect(Object.hasOwn(implementation.prototype, 'getPlatformAudio')).toBe(
        true,
      );
      const result = implementation.prototype.getPlatformAudio({
        account,
        query: {},
      });
      await expect(result).rejects.toBeInstanceOf(HttpException);
      await expect(result).rejects.toMatchObject({
        message: 'Platform audio is not supported for this platform',
      });
      const error: unknown = await result.catch((error: unknown) => error);
      expect(error).toBeInstanceOf(HttpException);
      if (error instanceof HttpException) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toBe(
          'Platform audio is not supported for this platform',
        );
      }
    },
  );
});
