import type { Readable } from "node:stream";

export interface StorageProvider {
  upload(params: {
    key: string;
    body: Buffer | Readable | NodeJS.ReadableStream;
    contentType: string;
    size?: number;
  }): Promise<string>;
  getPublicUrl(key: string): string;
  getFileKeyFromUrl(url: string, bucket: string): string | null;
  listObjectsOlderThan(
    cutoff: Date,
  ): Promise<Array<{ key: string; lastModified: Date }>>;
  deleteObjects(keys: string[]): Promise<void>;
}
