import { Injectable } from '@nestjs/common';
import { CreateSocialPostPreviewDto } from './dto/create-post-preview.dto';
import { SocialPostPreviewDto } from './dto/post-preview.dto';
import { PlatformConfiguration } from '../social-posts/dto/post-configurations.dto';

@Injectable()
export class SocialPostPreviewsService {
  constructor() {}

  createPostPreview(
    createPreviewInput: CreateSocialPostPreviewDto,
  ): SocialPostPreviewDto[] {
    const previews: SocialPostPreviewDto[] =
      createPreviewInput.preview_social_accounts.map((account) => {
        const accountConfig = createPreviewInput.account_configurations
          ?.filter((config) => config.social_account_id == account.id)
          ?.flatMap((config) => config.configuration)?.[0];

        const platformConfig = createPreviewInput.platform_configurations?.[
          account.platform as
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
        } as PlatformConfiguration;

        return {
          platform: account.platform,
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
