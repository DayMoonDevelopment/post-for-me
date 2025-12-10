import { Module } from '@nestjs/common';
import { YouTubeService } from './youtube.service';

@Module({
  exports: [YouTubeService],
  providers: [YouTubeService],
})
export class YouTubeModule {}
