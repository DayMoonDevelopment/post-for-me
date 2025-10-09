import { Module } from '@nestjs/common';

import { PaginationModule } from '../pagination/pagination.module';
import { SocialAccountFeedsController } from './social-account-feeds.controller';
import { SocialAccountFeedsService } from './social-account-feeds.service';

@Module({
  imports: [PaginationModule],
  controllers: [SocialAccountFeedsController],
  providers: [SocialAccountFeedsService],
})
export class SocialAccountFeedsModule {}
