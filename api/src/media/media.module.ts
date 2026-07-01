import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaStorageService } from './media-storage.service';
import { R2MediaStorageService } from '../r2/r2.service';
import { SupabaseMediaStorageService } from '../supabase/supabase-media-storage.service';

const storageProviderClass =
  process.env.STORAGE_PROVIDER === 'supabase'
    ? SupabaseMediaStorageService
    : R2MediaStorageService;

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    { provide: MediaStorageService, useClass: storageProviderClass },
  ],
})
export class MediaModule {}
