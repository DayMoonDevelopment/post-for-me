import { Module } from '@nestjs/common';
import { TikTokBusinessService } from './tiktok-business.service';

@Module({
  exports: [TikTokBusinessService],
})
export class TikTokBusinessModule {}
