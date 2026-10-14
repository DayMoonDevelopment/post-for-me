import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../supabase';

export async function deleteSocialPostsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const client = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // social_post_provider_connections / social_post_media /
  // social_post_configurations all cascade-delete on post_id.
  await client.from('social_posts').delete().in('id', ids);
}
