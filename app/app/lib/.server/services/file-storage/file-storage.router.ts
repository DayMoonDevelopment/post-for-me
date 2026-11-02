import type { StorageProvider } from "~/lib/types/file-storage";

import type { FileStorageService, StorageClient } from "./file-storage.service";

import { createSupabaseStorageClient } from "./providers/supabase.storage";

/**
 * Build the provider-agnostic {@link FileStorageService}. `using(provider)`
 * dispatches to that provider's adapter, constructing it lazily and caching it
 * for the life of this service instance (so repeated `using("supabase")` calls
 * share one adapter). Adding a backend = one `case` here + its adapter file;
 * no existing call-site changes.
 */
export function createFileStorageService(): FileStorageService {
  const adapters = new Map<StorageProvider, StorageClient>();

  return {
    using(provider) {
      const cached = adapters.get(provider);
      if (cached) return cached;
      const adapter = buildAdapter(provider);
      adapters.set(provider, adapter);
      return adapter;
    },
  };
}

function buildAdapter(provider: StorageProvider): StorageClient {
  switch (provider) {
    case "supabase":
      return createSupabaseStorageClient();
    default:
      // Unreachable while `StorageProvider` has one member; the throw guards
      // against a bad value cast in, and forces a `case` when the union grows.
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}
