import { Module } from '@nestjs/common';
import { SocialAccountsController } from './social-provider-connections.controller';
import { SocialAccountsService } from './social-provider-connections.service';
import { PaginationModule } from '../pagination/pagination.module';
import { SocialProviderAppCredentialsModule } from '../social-provider-app-credentials/social-provider-app-credentials.module';

@Module({
  imports: [PaginationModule, SocialProviderAppCredentialsModule],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
})
export class SocialAccountsModule {}
