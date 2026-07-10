import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaTusModule } from './tus/media-tus.module';

@Module({
  imports: [MediaTusModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
