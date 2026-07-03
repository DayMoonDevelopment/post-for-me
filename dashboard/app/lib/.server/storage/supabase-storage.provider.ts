import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/.server/database.types";
import type {
  IStorageProvider,
  StorageFile,
  StorageListOptions,
  StorageUploadOptions,
} from "./storage.provider";

class SupabaseStorageProvider implements IStorageProvider {
  constructor(private readonly supabaseServiceRole: SupabaseClient<Database>) {}

  async upload(bucket: string, key: string, data: Buffer | Blob | File, options?: StorageUploadOptions): Promise<void> {
    const { error } = await this.supabaseServiceRole.storage
      .from(bucket)
      .upload(key, data, options);
    if (error) throw error;
  }

  async uploadFromFilePath(_bucket: string, _key: string, _filePath: string, _contentType: string): Promise<void> {
    throw new Error("uploadFromFilePath is not implemented in the dashboard storage provider");
  }

  async download(bucket: string, key: string): Promise<Blob> {
    const { data, error } = await this.supabaseServiceRole.storage
      .from(bucket)
      .download(key);
    if (error) throw error;
    if (!data) throw new Error(`File not found: ${bucket}/${key}`);
    return data;
  }

  async remove(bucket: string, keys: string[]): Promise<void> {
    const { error } = await this.supabaseServiceRole.storage
      .from(bucket)
      .remove(keys);
    if (error) throw error;
  }

  async list(bucket: string, prefix?: string, options?: StorageListOptions): Promise<StorageFile[]> {
    const { data, error } = await this.supabaseServiceRole.storage
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
    const { data } = this.supabaseServiceRole.storage
      .from(bucket)
      .getPublicUrl(key);
    return data.publicUrl;
  }

  async createSignedUploadUrl(bucket: string, key: string): Promise<string> {
    const { data, error } = await this.supabaseServiceRole.storage
      .from(bucket)
      .createSignedUploadUrl(key);
    if (error) throw error;
    if (!data) throw new Error("Signed URL not found");
    return data.signedUrl;
  }
}

export function createStorageProvider(supabaseServiceRole: SupabaseClient<Database>): IStorageProvider {
  return new SupabaseStorageProvider(supabaseServiceRole);
}
