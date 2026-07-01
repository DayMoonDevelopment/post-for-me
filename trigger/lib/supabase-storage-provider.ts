import type { Readable } from "node:stream";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Upload } from "tus-js-client";
import type { Database } from "../supabase.types";
import type { StorageProvider } from "./storage-provider";

export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: SupabaseClient<Database>;
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor(bucket: string) {
    this.supabaseUrl = process.env.SUPABASE_URL!;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.bucket = bucket;
    this.client = createClient<Database>(this.supabaseUrl, this.serviceRoleKey);
  }

  async upload(params: {
    key: string;
    body: Buffer | Readable | NodeJS.ReadableStream;
    contentType: string;
    size?: number;
  }): Promise<string> {
    const { body, key, contentType } = params;
    const uploadSize =
      params.size ?? (body instanceof Buffer ? body.byteLength : undefined);

    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(body as Readable, {
        endpoint: `${this.supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${this.serviceRoleKey}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: this.bucket,
          objectName: key,
          contentType,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        ...(uploadSize !== undefined ? { uploadSize } : {}),
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

    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${key}`;
  }

  getFileKeyFromUrl(url: string, bucket: string): string | null {
    const match = url.match(
      new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`),
    );
    return match ? match[1] : null;
  }

  async listObjectsOlderThan(
    cutoff: Date,
  ): Promise<Array<{ key: string; lastModified: Date }>> {
    const results: Array<{ key: string; lastModified: Date }> = [];
    let offset = 0;
    const limit = 1000;

    for (;;) {
      const { data: files, error } = await this.client.storage
        .from(this.bucket)
        .list(undefined, {
          limit,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });

      if (error) throw new Error(`Supabase list error: ${error.message}`);
      if (!files?.length) break;

      for (const file of files) {
        if (
          file.created_at &&
          new Date(file.created_at) < cutoff &&
          file.metadata?.mimetype !== "text/plain"
        ) {
          results.push({
            key: file.name,
            lastModified: new Date(file.created_at),
          });
        }
      }

      if (files.length < limit) break;
      offset += limit;
    }

    return results;
  }

  async deleteObjects(keys: string[]): Promise<void> {
    const BATCH_SIZE = 50;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove(batch);
      if (error) throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
}
