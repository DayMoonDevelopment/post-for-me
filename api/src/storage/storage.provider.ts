export interface StorageFile {
  name: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface StorageUploadOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  metadata?: Record<string, string>;
}

export interface StorageListOptions {
  limit?: number;
  offset?: number;
  sortBy?: { column: string; order: 'asc' | 'desc' };
}

export interface IStorageProvider {
  upload(
    bucket: string,
    key: string,
    data: Buffer | Blob | File,
    options?: StorageUploadOptions,
  ): Promise<void>;
  uploadFromFilePath(
    bucket: string,
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<void>;
  download(bucket: string, key: string): Promise<Blob>;
  remove(bucket: string, keys: string[]): Promise<void>;
  list(
    bucket: string,
    prefix?: string,
    options?: StorageListOptions,
  ): Promise<StorageFile[]>;
  getPublicUrl(bucket: string, key: string): string;
  createSignedUploadUrl(bucket: string, key: string): Promise<string>;
}
