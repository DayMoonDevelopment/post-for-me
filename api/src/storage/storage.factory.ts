import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageProvider } from './supabase-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { isR2StorageEnabled } from '../tracking/posthog';
import type { Database } from '../../supabase';
import type { IStorageProvider } from './storage.provider';

// Lazily-initialized singletons — deferred so env vars are populated by the
// time getStorageProvider() is first called (module-level init runs before
// NestJS ConfigModule loads .env).
let _supabase: SupabaseStorageProvider | undefined;
let _r2: R2StorageProvider | undefined;

function getSupabase(): SupabaseStorageProvider {
  if (!_supabase) {
    _supabase = new SupabaseStorageProvider(
      createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
      ),
    );
  }
  return _supabase;
}

function getR2(): R2StorageProvider {
  if (!_r2) {
    _r2 = new R2StorageProvider();
  }
  return _r2;
}

export async function getStorageProvider(
  teamId: string,
  projectId?: string,
): Promise<IStorageProvider> {
  return (await isR2StorageEnabled(teamId, projectId))
    ? getR2()
    : getSupabase();
}
