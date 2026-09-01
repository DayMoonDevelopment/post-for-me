import type { ConfigService } from '@nestjs/config';

export function getMediaBucket(configService: ConfigService): string {
  return configService.get<string>('MEDIA_BUCKET') ?? 'post-media';
}
