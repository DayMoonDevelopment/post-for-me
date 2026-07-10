import { Module } from '@nestjs/common';
import { MediaTusController } from './media-tus.controller';
import { MediaTusService } from './media-tus.service';

@Module({
  controllers: [MediaTusController],
  providers: [MediaTusService],
})
export class MediaTusModule {}
