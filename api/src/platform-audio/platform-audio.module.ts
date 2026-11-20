import { Module } from '@nestjs/common';
import { InstagramModule } from '../instagram/instagram.module';
import { TikTokBusinessModule } from '../tiktok-business/tiktok-business.module';
import { PlatformAudioController } from './platform-audio.controller';
import { PlatformAudioService } from './platform-audio.service';

@Module({
  imports: [InstagramModule, TikTokBusinessModule],
  controllers: [PlatformAudioController],
  providers: [PlatformAudioService],
})
export class PlatformAudioModule {}
