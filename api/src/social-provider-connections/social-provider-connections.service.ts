import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import { SocialAccountDto } from './dto/social-accounts.dto';
import { SocialAccountQueryDto } from './dto/social-accounts-query.dto';
import type { PaginatedRequestQuery } from '../pagination/pagination-request.interface';
import { SocialProviderAppCredentialsDto } from '../social-provider-app-credentials/dto/social-provider-app-credentials.dto';
import { generateAuthUrl } from './helper/auth-url.helper';
import { ConfigService } from '@nestjs/config';
import { AuthUrlProviderData } from './dto/create-provider-auth-url.dto';
import { DeleteEntityResponseDto } from '../lib/dto/global.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import {
  CreateSocialAccountDto,
  SocialAccountMetadata,
} from './dto/create-social-account.dto';
import { Database } from '../../supabase';
import { TokenRefreshService } from '../token-refresh/token-refresh.service';
import { SocialAccount } from '../lib/dto/global.dto';
import { mapWithConcurrency } from '../lib/async.utils';

type ProviderEnum = Database['public']['Enums']['social_provider'];
const TOKEN_REFRESH_CONCURRENCY = 5;

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly tokenRefreshService: TokenRefreshService,
  ) {}

  private toSocialAccountEntity(row: {
    id: string;
    provider: string | null;
    social_provider_user_name: string | null;
    access_token: string | null;
    refresh_token: string | null;
    access_token_expires_at: string | null;
    refresh_token_expires_at: string | null;
    social_provider_user_id: string | null;
    social_provider_metadata: unknown;
  }): SocialAccount {
    return {
      provider: row.provider as SocialAccount['provider'],
      id: row.id,
      social_provider_user_name: row.social_provider_user_name,
      access_token: row.access_token || '',
      refresh_token: row.refresh_token,
      access_token_expires_at: row.access_token_expires_at
        ? new Date(row.access_token_expires_at)
        : null,
      refresh_token_expires_at: row.refresh_token_expires_at
        ? new Date(row.refresh_token_expires_at)
        : null,
      social_provider_user_id: row.social_provider_user_id || '',
      social_provider_metadata: row.social_provider_metadata,
    };
  }

  async getSocialAccounts(
    queryParams: SocialAccountQueryDto,
    projectId: string,
  ): PaginatedRequestQuery<SocialAccountDto> {
    const { offset, limit, platform, username, external_id, id, status } =
      queryParams;

    const query = this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .select(
        'id, provider, social_provider_user_name, social_provider_profile_photo_url, social_provider_user_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, external_id, social_provider_metadata, created_at',
        { count: 'estimated', head: false },
      )
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);

    if (platform) {
      const values: string[] = [];

      switch (true) {
        case typeof platform === 'string': {
          values.push(...(platform as string).split(','));
          break;
        }
        case Array.isArray(platform):
          values.push(...platform);
          break;
        default:
          values.push(platform);
          break;
      }

      query.in(
        'provider',
        values.map((provider) => provider as ProviderEnum),
      );
    }

    if (external_id) {
      const values: string[] = [];

      switch (true) {
        case typeof external_id === 'string': {
          values.push(...(external_id as string).split(','));
          break;
        }
        case Array.isArray(external_id):
          values.push(...external_id);
          break;
        default:
          values.push(external_id);
          break;
      }

      query.in('external_id', values);
    }

    if (id) {
      const values: string[] = [];

      switch (true) {
        case typeof id === 'string': {
          values.push(...(id as string).split(','));
          break;
        }
        case Array.isArray(id):
          values.push(...id);
          break;
        default:
          values.push(id);
          break;
      }
      query.in('id', values);
    }

    if (username) {
      const values: string[] = [];

      switch (true) {
        case typeof username === 'string': {
          values.push(...(username as string).split(','));
          break;
        }
        case Array.isArray(username):
          values.push(...username);
          break;
        default:
          values.push(username);
          break;
      }
      query.in('social_provider_user_name', values);
    }

    if (status) {
      const values: string[] = [];

      switch (true) {
        case typeof status === 'string': {
          values.push(...(status as string).split(','));
          break;
        }
        case Array.isArray(status):
          values.push(...status);
          break;
        default:
          values.push(status);
          break;
      }

      if (
        values.indexOf('disconnected') > -1 &&
        values.indexOf('connected') < 0
      ) {
        query.is('access_token', null);
      } else if (
        values.indexOf('connected') > -1 &&
        values.indexOf('disconnected') < 0
      ) {
        query.not('access_token', 'is', null);
      }
    }

    query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const refreshedRows = await mapWithConcurrency(
      data,
      async (raw) => {
        if (!raw.access_token) {
          return raw;
        }

        const refreshed = await this.tokenRefreshService.refreshIfNeeded({
          account: this.toSocialAccountEntity(raw),
          projectId,
        });

        return {
          ...raw,
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          access_token_expires_at:
            refreshed.access_token_expires_at?.toISOString() ??
            raw.access_token_expires_at,
          refresh_token_expires_at:
            refreshed.refresh_token_expires_at?.toISOString() ??
            raw.refresh_token_expires_at,
        };
      },
      TOKEN_REFRESH_CONCURRENCY,
    );

    const transformedData: SocialAccountDto[] = refreshedRows.map((raw) => ({
      id: raw.id,
      platform: raw.provider || '',
      username: raw.social_provider_user_name || '',
      profile_photo_url: raw.social_provider_profile_photo_url,
      user_id: raw.social_provider_user_id || '',
      status: raw.access_token ? 'connected' : 'disconnected',
      external_id: raw.external_id,
      access_token: raw.access_token || '',
      refresh_token: raw.refresh_token || '',
      access_token_expires_at:
        raw.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: raw.refresh_token_expires_at,
      metadata: raw.social_provider_metadata as SocialAccountMetadata,
    }));

    return {
      data: transformedData,
      count: count || 0,
    };
  }

  async getSocialAccountById({
    id,
    projectId,
  }: {
    id: string;
    projectId: string;
  }): Promise<SocialAccountDto | null> {
    const socialAccount = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .select(
        'id, provider, social_provider_user_name, social_provider_profile_photo_url, social_provider_user_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, external_id, social_provider_metadata',
      )
      .eq('id', id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (socialAccount.error) {
      throw socialAccount.error;
    }

    if (!socialAccount.data) {
      return null;
    }

    let accessToken = socialAccount.data.access_token;
    let refreshToken = socialAccount.data.refresh_token;
    let accessTokenExpiresAt = socialAccount.data.access_token_expires_at;
    let refreshTokenExpiresAt = socialAccount.data.refresh_token_expires_at;

    if (accessToken) {
      const refreshed = await this.tokenRefreshService.refreshIfNeeded({
        account: this.toSocialAccountEntity(socialAccount.data),
        projectId,
      });

      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token;
      accessTokenExpiresAt =
        refreshed.access_token_expires_at?.toISOString() ??
        accessTokenExpiresAt;
      refreshTokenExpiresAt =
        refreshed.refresh_token_expires_at?.toISOString() ??
        refreshTokenExpiresAt;
    }

    return {
      id: socialAccount.data.id,
      platform: socialAccount.data.provider || '',
      username: socialAccount.data.social_provider_user_name || '',
      user_id: socialAccount.data.social_provider_user_id || '',
      profile_photo_url: socialAccount.data.social_provider_profile_photo_url,
      status: socialAccount.data.access_token ? 'connected' : 'disconnected',
      external_id: socialAccount.data.external_id,
      access_token: accessToken || '',
      refresh_token: refreshToken || '',
      access_token_expires_at: accessTokenExpiresAt || new Date().toISOString(),
      refresh_token_expires_at: refreshTokenExpiresAt,
      metadata: socialAccount.data
        .social_provider_metadata as SocialAccountMetadata,
    };
  }

  async getSocialAccountAuthUrl({
    projectId,
    appCredentials,
    providerData,
    externalId,
    redirectUrlOverride,
    permissions,
    isSystem,
  }: {
    projectId: string;
    appCredentials: SocialProviderAppCredentialsDto;
    providerData: AuthUrlProviderData | null | undefined;
    externalId: string | undefined;
    redirectUrlOverride: string | undefined | null;
    permissions: string[];
    isSystem: boolean;
  }): Promise<string | undefined> {
    const authUrl = await generateAuthUrl({
      projectId,
      isSystem,
      appCredentials,
      configService: this.configService,
      supabaseService: this.supabaseService,
      providerData,
      externalId,
      redirectUrlOverride,
      permissions,
    });

    return authUrl;
  }

  async deleteSocialAccount({
    id,
    projectId,
  }: {
    id: string;
    projectId: string;
  }): Promise<DeleteEntityResponseDto> {
    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Social account not found');
    }

    return { success: true };
  }

  async createSocialAccount({
    projectId,
    socialAccount,
  }: {
    projectId: string;
    socialAccount: CreateSocialAccountDto;
  }): Promise<SocialAccountDto> {
    let meatadata: SocialAccountMetadata = {};

    if (socialAccount.metadata) {
      meatadata = socialAccount.metadata;
    }

    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .upsert(
        {
          project_id: projectId,
          provider: socialAccount.platform,
          social_provider_user_name: socialAccount.username,
          social_provider_user_id: socialAccount.user_id,
          external_id: socialAccount.external_id,
          access_token: socialAccount.access_token,
          refresh_token: socialAccount.refresh_token,
          access_token_expires_at:
            socialAccount.access_token_expires_at.toISOString(),
          refresh_token_expires_at: socialAccount.refresh_token_expires_at
            ? socialAccount.refresh_token_expires_at.toISOString()
            : null,
          social_provider_metadata: { ...meatadata },
        },
        {
          onConflict: 'provider,project_id,social_provider_user_id',
        },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      platform: data.provider || '',
      username: data.social_provider_user_name || '',
      user_id: data.social_provider_user_id || '',
      profile_photo_url: data.social_provider_profile_photo_url,
      status: data.access_token ? 'connected' : 'disconnected',
      external_id: data.external_id,
      access_token: data.access_token || '',
      refresh_token: data.refresh_token || '',
      access_token_expires_at:
        data.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: data.refresh_token_expires_at,
      metadata: data.social_provider_metadata as SocialAccountMetadata,
    };
  }

  async updateSocialAccount({
    id,
    projectId,
    updateData,
  }: {
    id: string;
    projectId: string;
    updateData: UpdateSocialAccountDto;
  }): Promise<SocialAccountDto> {
    const updateFields: {
      social_provider_user_name?: string;
      external_id?: string;
    } = {};

    if (updateData.username !== undefined) {
      updateFields.social_provider_user_name = updateData.username;
    }

    if (updateData.external_id !== undefined) {
      updateFields.external_id = updateData.external_id;
    }

    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .update(updateFields)
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      platform: data.provider || '',
      username: data.social_provider_user_name || '',
      user_id: data.social_provider_user_id || '',
      profile_photo_url: data.social_provider_profile_photo_url,
      status: data.access_token ? 'connected' : 'disconnected',
      external_id: data.external_id,
      access_token: data.access_token || '',
      refresh_token: data.refresh_token || '',
      access_token_expires_at:
        data.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: data.refresh_token_expires_at,
      metadata: data.social_provider_metadata as SocialAccountMetadata,
    };
  }

  async disconnectSocialAccount(id: string, projectId: string): Promise<void> {
    const { error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .update({
        access_token: null,
        refresh_token: null,
      })
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
