import type { Readable } from "node:stream";
import {
  uploadToR2,
  getR2PublicUrl,
  getFileKeyFromUrl,
  listR2ObjectsOlderThan,
  deleteR2Objects,
} from "./r2";
import type { StorageProvider } from "./storage-provider";

export class R2StorageProvider implements StorageProvider {
  upload(params: {
    key: string;
    body: Buffer | Readable | NodeJS.ReadableStream;
    contentType: string;
    size?: number;
  }): Promise<string> {
    return uploadToR2(params);
  }

  getPublicUrl(key: string): string {
    return getR2PublicUrl(key);
  }

  getFileKeyFromUrl(url: string, bucket: string): string | null {
    return getFileKeyFromUrl(url, bucket);
  }

  listObjectsOlderThan(
    cutoff: Date,
  ): Promise<Array<{ key: string; lastModified: Date }>> {
    return listR2ObjectsOlderThan(cutoff);
  }

  deleteObjects(keys: string[]): Promise<void> {
    return deleteR2Objects(keys);
  }
}
