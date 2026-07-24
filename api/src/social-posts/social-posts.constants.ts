import type { Database } from '../../supabase';

type ProviderTypeEnum = Database['public']['Enums']['social_provider'];

export const DELETE_SUPPORTED_PROVIDERS: ProviderTypeEnum[] = [
  'x',
  'instagram',
  'facebook',
  'linkedin',
  'bluesky',
  'threads',
  'pinterest',
  'youtube',
];
