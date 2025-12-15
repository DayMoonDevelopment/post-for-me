import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Database } from '@post-for-me/db';
import { ConfigService } from '@nestjs/config';

type SocialProviderEnum = Database['public']['Enums']['social_provider'];

// Define the array of all possible enum values with type assertion
const socialProviders = [
  'facebook',
  'instagram',
  'x',
  'tiktok',
  'youtube',
  'pinterest',
  'linkedin',
  'bluesky',
  'threads',
  'tiktok_business',
] as const satisfies SocialProviderEnum[];

@Injectable()
export class SocialPostMetersService {
  private limits: {
    [K in SocialProviderEnum]: number;
  };

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const defaultLimit =
      this.configService.get<number>('DEFAULT_POST_LIMIT') || 100;

    for (const provider of socialProviders) {
      const limit = this.configService.get<number>(`${provider}_POST_LIMIT`);

      this.limits = { ...this.limits, [provider]: limit || defaultLimit };
    }
  }

  async hasMetLimit({
    teamId,
    scheduledDate,
    provider,
  }: {
    teamId: string;
    scheduledDate: Date;
    provider: string;
  }): Promise<boolean> {
    const day = scheduledDate.getUTCDay();
    const month = scheduledDate.getUTCMonth();
    const year = scheduledDate.getUTCFullYear();
    const hour = scheduledDate.getUTCHours();
    const min = scheduledDate.getUTCMinutes();

    const socialProvider = provider as SocialProviderEnum;
    const meter = await this.supabaseService.supabaseServiceRole
      .from('team_social_post_meters')
      .select('count')
      .eq('team_id', teamId)
      .eq('provider', socialProvider)
      .eq('day', day)
      .eq('month', month)
      .eq('year', year)
      .eq('hour', hour)
      .eq('minute', min)
      .single();

    const currentValue = meter.data?.count || 0;

    return currentValue >= this.limits[socialProvider];
  }

  async incrementSocialPostMeter({
    teamId,
    scheduledDate,
    provider,
  }: {
    teamId: string;
    scheduledDate: Date;
    provider: string;
  }) {
    const day = scheduledDate.getUTCDay();
    const month = scheduledDate.getUTCMonth();
    const year = scheduledDate.getUTCFullYear();
    const hour = scheduledDate.getUTCHours();
    const min = scheduledDate.getUTCMinutes();

    await this.supabaseService.supabaseServiceRole.rpc(
      'increment_team_social_post_meter',
      {
        p_team_id: teamId,
        p_day: day,
        p_month: month,
        p_year: year,
        p_hour: hour,
        p_min: min,
        p_provider: provider as SocialProviderEnum,
      },
    );
  }
}
