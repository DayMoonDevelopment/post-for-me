import type { ConfigService } from '@nestjs/config';

export const DEFAULT_FACEBOOK_API_VERSION = 'v25.0';
export const DEFAULT_INSTAGRAM_API_VERSION = 'v23.0';

export function getFacebookApiVersion(configService: ConfigService): string {
  return (
    configService.get<string>('FACEBOOK_API_VERSION') ||
    DEFAULT_FACEBOOK_API_VERSION
  );
}

export function getInstagramApiVersion(configService: ConfigService): string {
  return (
    configService.get<string>('INSTAGRAM_API_VERSION') ||
    DEFAULT_INSTAGRAM_API_VERSION
  );
}
