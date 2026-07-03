import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Upload } from "tus-js-client";
import { Database } from "../supabase.types";
import type {
  IStorageProvider,
  StorageFile,
  StorageListOptions,
  StorageUploadOptions,
} from "./storage.provider";

export class SupabaseStorageProvider implements IStorageProvider {
  private readonly supabaseClient: SupabaseClient<Database>;

  constructor() {
    this.supabaseClient = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | Blob | File,
    options?: StorageUploadOptions,
  ): Promise<void> {
    const { error } = await this.supabaseClient.storage
      .from(bucket)
      .upload(key, data, options);
    if (error) throw error;
  }

  async uploadFromFilePath(
    bucket: string,
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<void> {
    const { size: uploadSize } = await stat(filePath);
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(createReadStream(filePath) as any, {
        endpoint: `${process.env.SUPABASE_URL}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadSize,
        headers: {
          authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucket,
          objectName: key,
          contentType,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        onError: reject,
        onSuccess: () => resolve(),
      });

      upload
        .findPreviousUploads()
        .catch(() => [])
        .then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
    });
  }

  async download(bucket: string, key: string): Promise<Blob> {
    const { data, error } = await this.supabaseClient.storage
      .from(bucket)
      .download(key);
    if (error) throw error;
    if (!data) throw new Error(`File not found: ${bucket}/${key}`);
    return data;
  }

  async remove(bucket: string, keys: string[]): Promise<void> {
    const { error } = await this.supabaseClient.storage
      .from(bucket)
      .remove(keys);
    if (error) throw error;
  }

  async list(
    bucket: string,
    prefix?: string,
    options?: StorageListOptions,
  ): Promise<StorageFile[]> {
    const { data, error } = await this.supabaseClient.storage
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
    const { data } = this.supabaseClient.storage
      .from(bucket)
      .getPublicUrl(key);
    return data.publicUrl;
  }

  async createSignedUploadUrl(bucket: string, key: string): Promise<string> {
    const { data, error } = await this.supabaseClient.storage
      .from(bucket)
      .createSignedUploadUrl(key);
    if (error) throw error;
    if (!data) throw new Error("Signed URL not found");
    return data.signedUrl;
  }
}

export function createStorageProvider(): IStorageProvider {
  return new SupabaseStorageProvider();
}
