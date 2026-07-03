import { Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.provider';
import { SupabaseStorageProvider } from './supabase-storage.provider';

@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: SupabaseStorageProvider }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
