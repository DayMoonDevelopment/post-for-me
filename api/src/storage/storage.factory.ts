import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageProvider } from './supabase-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { isR2StorageEnabled } from '../tracking/posthog';
import type { Database } from '../../supabase';
import type { IStorageProvider } from './storage.provider';

// Module-level singletons. Both are stateless (they only hold connection
// credentials), so a per-request instance isn't needed. The Supabase provider
// uses the service-role key directly — the request-scoped SupabaseService (with
// its user-scoped client) isn't available outside the DI request pipeline.
const _supabase = new SupabaseStorageProvider(
  createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  ),
);
const _r2 = new R2StorageProvider();

export async function getStorageProvider(
  teamId: string,
): Promise<IStorageProvider> {
  return (await isR2StorageEnabled(teamId)) ? _r2 : _supabase;
}
