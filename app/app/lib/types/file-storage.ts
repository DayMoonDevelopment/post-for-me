/**
 * The storage backends the dashboard can read/write. Supabase is the only one
 * today; the union grows (e.g. `"r2"`) as we migrate off Supabase provider by
 * provider. Each call-site is pinned to ONE provider — migration is a per-route
 * code change (flip the provider + move the files), never a runtime lookup.
 */
export type StorageProvider = "supabase";

export const STORAGE_PROVIDERS = ["supabase"] as const;

export function isStorageProvider(value: unknown): value is StorageProvider {
  return (
    typeof value === "string" &&
    (STORAGE_PROVIDERS as readonly string[]).includes(value)
  );
}

/** Bytes accepted by {@link StorageClient.upload} — the common denominator
 * across provider SDKs (Supabase FileBody / S3 PutObject body). */
export type StorageBody = Blob | ArrayBuffer | ArrayBufferView | string;

export interface UploadOptions {
  /** MIME type to store the object as. */
  contentType?: string;
  /** Overwrite an existing object at the same key (default: false). */
  upsert?: boolean;
}

export interface UploadResult {
  /** The key the object was written to (echoed back for chaining). */
  key: string;
}
