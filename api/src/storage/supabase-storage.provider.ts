import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  IStorageProvider,
  StorageFile,
  StorageListOptions,
  StorageUploadOptions,
} from './storage.provider';

@Injectable()
export class SupabaseStorageProvider implements IStorageProvider {
  constructor(private readonly supabaseService: SupabaseService) {}

  async upload(
    bucket: string,
    key: string,
    data: Buffer | Blob | File,
    options?: StorageUploadOptions,
  ): Promise<void> {
    const { error } = await this.supabaseService.supabaseClient.storage
      .from(bucket)
      .upload(key, data, options);
    if (error) throw error;
  }

  uploadFromFilePath(
    _bucket: string,
    _key: string,
    _filePath: string,
    _contentType: string,
  ): Promise<void> {
    return Promise.reject(
      new Error(
        'uploadFromFilePath is not implemented in the API storage provider',
      ),
    );
  }

  async download(bucket: string, key: string): Promise<Blob> {
    const { data, error } = await this.supabaseService.supabaseClient.storage
      .from(bucket)
      .download(key);
    if (error) throw error;
    if (!data) throw new Error(`File not found: ${bucket}/${key}`);
    return data;
  }

  async remove(bucket: string, keys: string[]): Promise<void> {
    const { error } = await this.supabaseService.supabaseClient.storage
      .from(bucket)
      .remove(keys);
    if (error) throw error;
  }

  async list(
    bucket: string,
    prefix?: string,
    options?: StorageListOptions,
  ): Promise<StorageFile[]> {
    const { data, error } = await this.supabaseService.supabaseClient.storage
      .from(bucket)
      .list(prefix, options);
    if (error) throw error;
    return (data || []).map((f) => ({
      name: f.name,
      createdAt: f.created_at ?? undefined,
      updatedAt: f.updated_at ?? undefined,
      metadata: f.metadata ?? undefined,
    }));
  }

  getPublicUrl(bucket: string, key: string): string {
    const { data } = this.supabaseService.supabaseClient.storage
      .from(bucket)
      .getPublicUrl(key);
    return data.publicUrl;
  }

  async createSignedUploadUrl(bucket: string, key: string): Promise<string> {
    const { data, error } = await this.supabaseService.supabaseClient.storage
      .from(bucket)
      .createSignedUploadUrl(key);
    if (error) throw error;
    if (!data) throw new Error('Signed URL not found');
    return data.signedUrl;
  }

  async *listAll(bucket: string, prefix?: string): AsyncGenerator<StorageFile> {
    let offset = 0;
    const limit = 1000;
    while (true) {
      const files = await this.list(bucket, prefix, { limit, offset });
      for (const file of files) yield file;
      if (files.length < limit) break;
      offset += limit;
    }
  }
}
