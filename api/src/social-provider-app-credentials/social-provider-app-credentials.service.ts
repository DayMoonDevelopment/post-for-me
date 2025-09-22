import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SocialProviderAppCredentialsDto } from './dto/social-provider-app-credentials.dto';

@Injectable()
export class SocialProviderAppCredentialsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getSocialProviderAppCredentials(
    provider: string,
    projectId: string,
  ): Promise<SocialProviderAppCredentialsDto | null> {
    const { data, error } = await this.supabaseService.supabaseServiceRole
      .from('social_provider_app_credentials')
      .select('*')
      .eq(
        'provider',
        provider as
          | 'facebook'
          | 'instagram'
          | 'x'
          | 'tiktok'
          | 'youtube'
          | 'pinterest'
          | 'linkedin'
          | 'bluesky'
          | 'threads'
          | 'instagram_w_facebook',
      )
      .eq('project_id', projectId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      provider: data.provider,
      projectId: data?.project_id,
      appId: data?.app_id || '',
      appSecret: data?.app_secret || '',
    };
  }

  async getManySocialProviderAppCredentials(
    providers: string[],
    projectId: string,
  ): Promise<SocialProviderAppCredentialsDto[] | null> {
    const { data, error } = await this.supabaseService.supabaseServiceRole
      .from('social_provider_app_credentials')
      .select('*')
      .in(
        'provider',
        providers.map(
          (p) =>
            p as
              | 'facebook'
              | 'instagram'
              | 'x'
              | 'tiktok'
              | 'youtube'
              | 'pinterest'
              | 'linkedin'
              | 'bluesky'
              | 'threads'
              | 'instagram_w_facebook',
        ),
      )
      .eq('project_id', projectId);

    if (error || !data) {
      return null;
    }

    return data.map((d) => ({
      provider: d.provider,
      projectId: d?.project_id,
      appId: d?.app_id || '',
      appSecret: d?.app_secret || '',
    }));
  }
}
