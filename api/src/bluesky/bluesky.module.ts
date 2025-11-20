import { Module } from '@nestjs/common';
import { BlueskyService } from './bluesky.service';

@Module({
  exports: [BlueskyService],
  providers: [BlueskyService],
})
export class BlueskyModule {}
