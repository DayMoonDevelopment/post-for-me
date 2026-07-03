import { Module } from '@nestjs/common';
import { SupabaseStorageProvider } from './supabase-storage.provider';

@Module({
  providers: [SupabaseStorageProvider],
  exports: [SupabaseStorageProvider],
})
export class StorageModule {}
