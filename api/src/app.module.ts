import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { SocialPostsModule } from './social-posts/social-posts.module';
import { MediaModule } from './media/media.module';
import { SocialPostResultsModule } from './social-post-results/social-post-results.module';
import { SocialAccountsModule } from './social-provider-connections/social-provider-connections.module';

import { SupabaseModule } from './supabase/supabase.module';
import { AuthGuard } from './auth/auth.guard';
import { UnkeyModule } from './unkey/unkey.module';
import { SocialPostPreviewsModule } from './social-posts-previews/social-posts-previews.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SocialAccountFeedsModule } from './social-account-feeds/social-account-feeds.module';

import { LoggerModule } from './logger/logger.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    TelemetryModule,
    MediaModule,
    SocialPostsModule,
    SocialPostResultsModule,
    SupabaseModule,
    UnkeyModule,
    SocialAccountsModule,
    SocialPostPreviewsModule,
    WebhooksModule,
    SocialAccountFeedsModule,
  ],
  controllers: [],
  providers: [AuthGuard],
})
export class AppModule {}
