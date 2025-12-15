import { Module } from '@nestjs/common';
import { TikTokService } from './tiktok.service';

@Module({
  exports: [TikTokService],
  providers: [TikTokService],
})
export class TikTokModule {}
