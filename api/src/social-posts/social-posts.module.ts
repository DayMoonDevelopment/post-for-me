import { Module } from '@nestjs/common';
import { SocialPostsController } from './social-posts.controller';
import { SocialPostsService } from './social-posts.service';
import { PaginationModule } from '../pagination/pagination.module';
import { SocialPostMetersModule } from '../social-post-meters/social-post-meters.module';
import { SocialProviderAppCredentialsModule } from '../social-provider-app-credentials/social-provider-app-credentials.module';

@Module({
  imports: [
    PaginationModule,
    SocialPostMetersModule,
    SocialProviderAppCredentialsModule,
  ],
  controllers: [SocialPostsController],
  providers: [SocialPostsService],
})
export class SocialPostsModule {}
