import { Module } from '@nestjs/common';

import { PaginationModule } from '../pagination/pagination.module';
import { SocialAccountFeedsController } from './social-account-feeds.controller';
import { SocialAccountFeedsService } from './social-account-feeds.service';
import { TikTokBusinessModule } from '../tiktok-business/tiktok-business.module';
import { YouTubeModule } from '../youtube/youtube.module';
import { TikTokModule } from '../tiktok/tiktok.module';
import { InstagramModule } from '../instagram/instagram.module';
import { FacebookModule } from '../facebook/facebook.module';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { PinterestModule } from '../pinterest/pinterest.module';
import { ThreadsModule } from '../threads/threads.module';
import { TwitterModule } from '../twitter/twitter.module';
import { BlueskyModule } from '../bluesky/bluesky.module';

@Module({
  imports: [
    PaginationModule,
    TikTokBusinessModule,
    YouTubeModule,
    TikTokModule,
    InstagramModule,
    FacebookModule,
    LinkedInModule,
    PinterestModule,
    ThreadsModule,
    TwitterModule,
    BlueskyModule,
  ],
  controllers: [SocialAccountFeedsController],
  providers: [SocialAccountFeedsService],
})
export class SocialAccountFeedsModule {}
