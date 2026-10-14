import { Injectable } from '@nestjs/common';
import { CreateSocialPostPreviewDto } from './dto/create-post-preview.dto';
import { SocialPostPreviewDto } from './dto/post-preview.dto';
import { PlatformConfiguration } from '../social-posts/dto/post-configurations.dto';
import { normalizePlatform } from '../lib/platform.utils';

@Injectable()
export class SocialPostPreviewsService {
  constructor() {}

  createPostPreview(
    createPreviewInput: CreateSocialPostPreviewDto,
  ): SocialPostPreviewDto[] {
    const previews: SocialPostPreviewDto[] =
      createPreviewInput.preview_social_accounts.map((account) => {
        const platform = normalizePlatform(account.platform);
        const accountConfig = createPreviewInput.account_configurations
          ?.filter((config) => config.social_account_id == account.id)
          ?.flatMap((config) => config.configuration)?.[0];

        const platformConfig = createPreviewInput.platform_configurations?.[
          platform as
            | 'facebook'
            | 'instagram'
            | 'x'
            | 'tiktok'
            | 'youtube'
            | 'pinterest'
            | 'linkedin'
            | 'bluesky'
            | 'threads'
            | 'tiktok_business'
        ] as PlatformConfiguration;

        const caption =
          accountConfig?.caption ||
          platformConfig?.caption ||
          createPreviewInput.caption;

        const media =
          accountConfig?.media ||
          platformConfig?.media ||
          createPreviewInput.media;

        const configuration = {
          ...accountConfig,
          ...platformConfig,
        };

        return {
          platform,
          social_account_id: account.id,
          social_account_username: account.username,
          caption,
          media,
          configuration,
        };
      });

    return previews;
  }
}
