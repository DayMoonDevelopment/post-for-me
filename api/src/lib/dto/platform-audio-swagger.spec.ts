import 'reflect-metadata';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ModelPropertiesAccessor } from '@nestjs/swagger/dist/services/model-properties-accessor';
import { SchemaObjectFactory } from '@nestjs/swagger/dist/services/schema-object-factory';
import { SwaggerTypesMapper } from '@nestjs/swagger/dist/services/swagger-types-mapper';
import { PlatformAudioResponseDto } from './platform-audio.dto';
import { InstagramPlatformAudioDto } from '../../instagram/dto/instagram-audio.dto';
import { TikTokBusinessPlatformAudioDto } from '../../tiktok-business/dto/tiktok-business-audio.dto';
import {
  PlatformConfigurationsDto,
  AccountConfigurationDetailsDto,
} from '../../social-posts/dto/post-configurations.dto';

describe('platform audio Swagger contract', () => {
  it('documents provider unions, nullable scalar metadata, and publishing overrides', () => {
    // Exercise the same schema factory SwaggerModule uses, without an HTTP adapter.
    const factory = new SchemaObjectFactory(
      new ModelPropertiesAccessor(),
      new SwaggerTypesMapper(),
    );
    const schemas: Record<string, SchemaObject> = {};
    for (const model of [
      PlatformAudioResponseDto,
      InstagramPlatformAudioDto,
      TikTokBusinessPlatformAudioDto,
      PlatformConfigurationsDto,
      AccountConfigurationDetailsDto,
    ]) {
      factory.exploreModelSchema(model, schemas);
    }
    expect(schemas?.PlatformAudioResponseDto).toMatchObject({
      properties: {
        data: {
          type: 'array',
          items: {
            oneOf: [
              { $ref: '#/components/schemas/InstagramPlatformAudioDto' },
              { $ref: '#/components/schemas/TikTokBusinessPlatformAudioDto' },
            ],
          },
        },
      },
    });
    expect(schemas?.InstagramAudioPlatformDataDto).toMatchObject({
      properties: {
        audio_id: { type: 'string' },
        download_url: { type: 'string', nullable: true },
        is_ads_eligible: { type: 'boolean', nullable: true },
      },
    });
    expect(schemas?.TikTokAudioTrendingHistoryDto).toMatchObject({
      properties: {
        rank_position_daily: { type: 'string', nullable: true },
      },
    });
    expect(schemas?.PlatformConfigurationsDto).toMatchObject({
      properties: {
        tiktok_business: {
          allOf: [
            { $ref: '#/components/schemas/TiktokBusinessConfigurationDto' },
          ],
        },
      },
    });
    expect(schemas?.AccountConfigurationDetailsDto).toMatchObject({
      properties: {
        audio_configuration: {
          allOf: [
            { $ref: '#/components/schemas/InstagramAudioConfigurationDto' },
          ],
        },
        music_sound_info: {
          allOf: [
            { $ref: '#/components/schemas/TikTokBusinessMusicSoundInfoDto' },
          ],
        },
      },
    });
  });
});
