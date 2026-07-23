import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ConfigModule } from '@nestjs/config';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';

import { SocialPostsModule } from './social-posts/social-posts.module';
import { MediaModule } from './media/media.module';
import { SocialPostResultsModule } from './social-post-results/social-post-results.module';
import { SocialAccountsModule } from './social-provider-connections/social-provider-connections.module';

import { SupabaseModule } from './supabase/supabase.module';
import { KyselyModule } from './kysely/kysely.module';
import { AuthGuard } from './auth/auth.guard';
import { VerifyKeyGuard } from './auth/verify-key.guard';
import { UnkeyModule } from './unkey/unkey.module';
import { SocialPostPreviewsModule } from './social-posts-previews/social-posts-previews.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SocialAccountFeedsModule } from './social-account-feeds/social-account-feeds.module';
import { InstagramModule } from './instagram/instagram.module';
import { PrivateModule } from './private/private.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    MediaModule,
    SocialPostsModule,
    SocialPostResultsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    KyselyModule,
    UnkeyModule,
    SocialAccountsModule,
    SocialPostPreviewsModule,
    WebhooksModule,
    SocialAccountFeedsModule,
    InstagramModule,
    PrivateModule,
    HealthcheckModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    AuthGuard,
    VerifyKeyGuard,
  ],
})
export class AppModule {}
