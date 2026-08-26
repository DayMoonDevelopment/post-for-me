import { fromSupabase, NotFoundException } from "~/lib/.server/errors";
import {
  createSupabaseServiceRoleClient,
  type TypedSupabaseClient,
} from "~/lib/.server/supabase";

import type { StorageClient } from "../file-storage.service";

/**
 * Supabase-Storage {@link StorageClient}. Uses the **service-role** client (not
 * the request's RLS client): every op here is server-internal — the public
 * `post-media` `.txt` read and the service-role profile-photo upload — so RLS
 * scoping buys nothing. The client is built lazily on first use and reused for
 * the life of this adapter instance. Server-only; the secret never ships.
 */
export function createSupabaseStorageClient(): StorageClient {
  let client: TypedSupabaseClient | undefined;
  const storage = () => (client ??= createSupabaseServiceRoleClient()).storage;

  return {
    async download(bucket, key) {
      const { data, error } = await storage().from(bucket).download(key);
      if (error) throw fromSupabase(error, { context: { bucket, key } });
      if (!data) {
        throw new NotFoundException(undefined, {
          message: `No file at supabase:${bucket}/${key}`,
          context: { bucket, key },
        });
      }
      return data;
    },

    async upload(bucket, key, body, options) {
      const { error } = await storage()
        .from(bucket)
        .upload(key, body, {
          contentType: options?.contentType,
          upsert: options?.upsert ?? false,
        });
      if (error) throw fromSupabase(error, { context: { bucket, key } });
      return { key };
    },

    getPublicUrl(bucket, key) {
      return storage().from(bucket).getPublicUrl(key).data.publicUrl;
    },

    async delete(bucket, key) {
      const { error } = await storage().from(bucket).remove([key]);
      if (error) throw fromSupabase(error, { context: { bucket, key } });
    },
  };
}
