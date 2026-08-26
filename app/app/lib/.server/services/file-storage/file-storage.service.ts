import type {
  StorageBody,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "~/lib/types/file-storage";

/**
 * The low-level storage operations, identical across every provider. A route
 * gets one of these bound to a single provider via
 * {@link FileStorageService.using} and then speaks in buckets + keys — never in
 * provider specifics. This is the interface each provider adapter implements
 * (`providers/*.storage.ts`).
 */
export interface StorageClient {
  /** Remove an object. Throws on failure. */
  delete(bucket: string, key: string): Promise<void>;
  /** Fetch an object's bytes. Throws if it's missing or unreadable. */
  download(bucket: string, key: string): Promise<Blob>;
  /** The public URL for an object (assumes a public bucket). Pure string build,
   * no I/O. */
  getPublicUrl(bucket: string, key: string): string;
  /** Write bytes to `key`. Returns the key for chaining (e.g. into
   * {@link getPublicUrl}). Throws on failure. */
  upload(
    bucket: string,
    key: string,
    body: StorageBody,
    options?: UploadOptions,
  ): Promise<UploadResult>;
}

/**
 * Provider-agnostic file storage. Consumers pick their provider ONCE per
 * call-site with {@link using} and operate through the returned
 * {@link StorageClient}; migrating a route to another backend is a one-token
 * change (`using("supabase")` → `using("r2")`) plus moving the files. There is
 * deliberately no runtime file→provider resolution — the call-site owns that.
 */
export interface FileStorageService {
  using(provider: StorageProvider): StorageClient;
}
