import { R2StorageProvider } from "./r2-storage-provider";
import { SupabaseStorageProvider } from "./supabase-storage-provider";
import type { StorageProvider } from "./storage-provider";

export function createStorageProvider(): StorageProvider {
  if (process.env.STORAGE_PROVIDER === "supabase") {
    return new SupabaseStorageProvider("post-media");
  }
  return new R2StorageProvider();
}

export type { StorageProvider };
